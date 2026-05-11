import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/stock - Get all stock movements
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const movements = await prisma.stockMovement.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Stock API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}

// POST /api/stock - Create a stock adjustment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only admin, manager, or storekeeper can adjust stock
    if (
      session.user.role.name !== "admin" &&
      session.user.role.name !== "manager" &&
      session.user.role.name !== "storekeeper"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { productId, type, qty, reason } = body;

    if (!productId || !type || !qty) {
      return NextResponse.json(
        { error: "Product ID, type, and quantity are required" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // For OUT adjustments, check if there's enough stock
    if (type === "OUT" && product.stockQty < qty) {
      return NextResponse.json(
        { error: "Insufficient stock for this adjustment" },
        { status: 400 }
      );
    }

    // Create stock movement and update product stock
    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        type,
        qty,
        reason,
        userId: session.user.id,
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: {
        stockQty: {
          [type === "IN" ? "increment" : "decrement"]: qty,
        },
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Stock API Error:", error);
    return NextResponse.json(
      { error: "Failed to create stock movement" },
      { status: 500 }
    );
  }
}