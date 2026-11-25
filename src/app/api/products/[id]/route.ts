import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changeLocationStock, ensureCompanyLocations } from "@/lib/locations";

// GET /api/products/[id] - Get a single product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Product GET Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role.name !== "admin" && session.user.role.name !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, categoryId, price, cost, stockQty, lowStockThreshold } = body;
    const barcode = body.barcode?.trim() || null;

    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (existing.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextQty = Number(stockQty) || 0;
    const delta = nextQty - existing.stockQty;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          name,
          barcode,
          categoryId,
          price: Number(price) || 0,
          cost: Number(cost) || 0,
          lowStockThreshold: Number(lowStockThreshold) || 5,
        },
        include: {
          category: true,
        },
      });

      if (delta !== 0 && existing.companyId) {
        const { shop } = await ensureCompanyLocations(tx, existing.companyId);
        await changeLocationStock(tx, {
          productId: existing.id,
          storeId: shop.id,
          delta,
          movementType: "ADJUSTMENT",
          movementQty: Math.abs(delta),
          reason: "Product stock edit",
          userId: session.user.id,
        });
      } else if (delta !== 0) {
        await tx.product.update({
          where: { id: existing.id },
          data: { stockQty: nextQty },
        });
      }

      return updated;
    });

    return NextResponse.json({ ...product, stockQty: nextQty });
  } catch (error: any) {
    console.error("Product PUT Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete a product (soft delete or queue for approval)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role.name !== "admin" &&
      session.user.role.name !== "manager" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { prisma } = await import("@/lib/prisma");

    const product = await prisma.product.findUnique({
      where: { id: params.id }
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const isAdmin = session.user.role.name === "admin" || session.user.role.name === "superadmin";

    if (isAdmin) {
      // Admins/Superadmins soft-delete directly
      await prisma.product.update({
        where: { id: params.id },
        data: {
          isActive: false,
          isPendingDelete: false,
        },
      });
      return NextResponse.json({ success: true });
    } else {
      // Managers create a deletion request for admin approval
      await prisma.$transaction([
        prisma.product.update({
          where: { id: params.id },
          data: {
            isPendingDelete: true,
          },
        }),
        prisma.deletionRequest.create({
          data: {
            companyId: session.user.companyId || "",
            resourceType: "PRODUCT",
            resourceId: params.id,
            resourceName: product.name,
            requestedById: session.user.id,
            status: "PENDING",
          },
        }),
      ]);
      return NextResponse.json({ success: true, pendingApproval: true });
    }
  } catch (error: any) {
    console.error("Product DELETE Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}