import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/products - List all active products
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(session.user.role.name !== "superadmin" ? { companyId: session.user.companyId } : {}),
      },
      include: {
        category: {
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

    return NextResponse.json(products);
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

    const product = await prisma.product.create({
      data: {
        name,
        barcode,
        categoryId,
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        stockQty: Number(stockQty) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
      include: {
        category: true,
      },
    });

    // Create initial stock movement if stockQty > 0
    if (stockQty > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          qty: Number(stockQty),
          reason: "Initial stock",
          userId: session.user.id,
        },
      });
    }

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