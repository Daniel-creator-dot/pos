import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sellableQty } from "@/lib/checkout";
import { ensureCompanyLocations } from "@/lib/locations";

function withLocations(product: {
  stockQty: number;
  stockLevels?: { qty: number; storeId: string; store: { kind: string } }[];
}, locations?: { shopId: string; warehouseId: string }) {
  const levels = product.stockLevels || [];
  const shopLevels = levels.filter((level) => level.store.kind === "STORE");
  const warehouseLevels = levels.filter((level) => level.store.kind === "WAREHOUSE");
  return {
    ...product,
    shopQty: sellableQty(
      product.stockQty,
      levels.map((level) => ({ qty: level.qty, kind: level.store.kind }))
    ),
    warehouseQty: levels.length
      ? warehouseLevels.reduce((sum, level) => sum + level.qty, 0)
      : 0,
    shopId: locations?.shopId ?? shopLevels[0]?.storeId ?? null,
    warehouseId: locations?.warehouseId ?? warehouseLevels[0]?.storeId ?? null,
  };
}

// GET /api/products - List all active products
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    let locations: { shopId: string; warehouseId: string } | undefined;
    if (session.user.role.name !== "superadmin" && session.user.companyId) {
      const ensured = await prisma.$transaction((tx) =>
        ensureCompanyLocations(tx, session.user.companyId as string)
      );
      locations = { shopId: ensured.shop.id, warehouseId: ensured.warehouse.id };
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(session.user.role.name !== "superadmin" ? { companyId: session.user.companyId } : {}),
      },
      include: {
        stockLevels: {
          include: {
            store: { select: { kind: true } },
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products.map((product) => withLocations(product, locations)));
  } catch (error) {
    console.error("Products API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission (admin, manager, or superadmin)
    if (
      session.user.role.name !== "admin" && 
      session.user.role.name !== "manager" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, categoryId, price, cost, stockQty, lowStockThreshold } = body;
    // Convert empty barcode string to null to avoid unique constraint violation
    const barcode = body.barcode?.trim() || null;

    const { prisma } = await import("@/lib/prisma");

    const opening = Number(stockQty) || 0;
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          barcode,
          categoryId,
          price: Number(price) || 0,
          cost: Number(cost) || 0,
          stockQty: opening,
          lowStockThreshold: Number(lowStockThreshold) || 5,
          companyId: session.user.companyId,
          createdById: session.user.id,
        },
        include: {
          category: true,
        },
      });

      if (session.user.companyId) {
        const { shop } = await ensureCompanyLocations(tx, session.user.companyId);
        if (opening > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              storeId: shop.id,
              type: "IN",
              qty: opening,
              reason: "Opening shop stock",
              userId: session.user.id,
            },
          });
        }
      } else if (opening > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "IN",
            qty: opening,
            reason: "Initial stock",
            userId: session.user.id,
          },
        });
      }

      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Products POST Error:", error);
    const message = error?.message || "Failed to create product";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}