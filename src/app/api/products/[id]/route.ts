import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  } catch (error) {
    console.error("Product API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
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
    const { name, barcode, categoryId, price, cost, stockQty, lowStockThreshold } = body;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        barcode,
        categoryId,
        price,
        cost,
        stockQty,
        lowStockThreshold,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product API Error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
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
  } catch (error) {
    console.error("Product API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}