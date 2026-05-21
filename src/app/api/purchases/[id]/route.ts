import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/purchases/[id] - Get a single purchase
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Access check: non-superadmins can only access purchases within their company
    if (session.user.role.name !== "superadmin" && purchase.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Purchase API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase" },
      { status: 500 }
    );
  }
}

// PUT /api/purchases/[id] - Update a purchase status
export async function PUT(
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
      session.user.role.name !== "storekeeper" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        purchaseItems: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    if (session.user.role.name !== "superadmin" && purchase.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body; // PENDING, COMPLETED, CANCELLED

    if (status !== "PENDING" && status !== "COMPLETED" && status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // If purchase is already COMPLETED or CANCELLED, we shouldn't allow changing its status
    if (purchase.status !== "PENDING" && status !== purchase.status) {
      return NextResponse.json(
        { error: `Cannot change status of a ${purchase.status.toLowerCase()} purchase` },
        { status: 400 }
      );
    }

    // Execute within transaction to guarantee stock consistency
    const updatedPurchase = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchase.update({
        where: { id: params.id },
        data: { status },
      });

      // If status is updated to COMPLETED, increment stock levels and create stock movements
      if (status === "COMPLETED" && purchase.status === "PENDING") {
        for (const item of purchase.purchaseItems) {
          // Increment product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: {
                increment: item.qty,
              },
            },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "IN",
              qty: item.qty,
              reason: "Purchase Completion",
              userId: session.user.id,
              reference: purchase.id,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json(updatedPurchase);
  } catch (error: any) {
    console.error("Purchase API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update purchase" },
      { status: 500 }
    );
  }
}

// DELETE /api/purchases/[id] - Delete a purchase
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Access check: only admins or superadmins can delete purchases
    if (session.user.role.name !== "admin" && session.user.role.name !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: params.id },
      include: {
        purchaseItems: true,
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    // Scoping check: non-superadmins can only delete purchases belonging to their company
    if (session.user.role.name !== "superadmin" && purchase.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Execute deletion inside a transaction
    await prisma.$transaction(async (tx) => {
      // Revert stock changes if the purchase was COMPLETED
      if (purchase.status === "COMPLETED") {
        for (const item of purchase.purchaseItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: {
                decrement: item.qty,
              },
            },
          });
        }

        // Delete associated stock movements
        await tx.stockMovement.deleteMany({
          where: {
            reference: purchase.id,
            productId: { in: purchase.purchaseItems.map(item => item.productId) },
          },
        });
      }

      // Delete the purchase (cascades to PurchaseItem)
      await tx.purchase.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: "Purchase deleted successfully" });
  } catch (error: any) {
    console.error("Purchase DELETE Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete purchase" },
      { status: 500 }
    );
  }
}

