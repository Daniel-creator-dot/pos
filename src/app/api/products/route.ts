import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/products - List all active products
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
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

    // Check if user has permission (admin or manager)
    if (session.user.role.name !== "admin" && session.user.role.name !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, barcode, categoryId, price, cost, stockQty, lowStockThreshold } = body;

    const product = await prisma.product.create({
      data: {
        name,
        barcode,
        categoryId,
        price,
        cost,
        stockQty: stockQty || 0,
        lowStockThreshold: lowStockThreshold || 5,
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
          qty: stockQty,
          reason: "Initial stock",
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Products API Error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}