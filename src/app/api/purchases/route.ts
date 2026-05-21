import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/purchases - List all purchases
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        ...(session.user.role.name !== "superadmin" ? { companyId: session.user.companyId } : {}),
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
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

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Purchases API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

// POST /api/purchases - Create a new purchase
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (
      session.user.role.name !== "admin" &&
      session.user.role.name !== "manager" &&
      session.user.role.name !== "storekeeper" &&
      session.user.role.name !== "superadmin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { supplierId, items, notes } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier and items are required" },
        { status: 400 }
      );
    }

    // Filter out invalid items (like empty product IDs)
    const validItems = items.filter((item: any) => item.productId && item.productId.trim() !== "");
    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid product must be selected" },
        { status: 400 }
      );
    }

    // Calculate total
    const total = validItems.reduce(
      (sum: number, item: { qty: number; unitCost: number }) =>
        sum + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
      0
    );

    // Create purchase
    const purchase = await prisma.purchase.create({
      data: {
        supplierId,
        userId: session.user.id,
        companyId: session.user.companyId,
        total,
        notes,
        status: "PENDING",
        purchaseItems: {
          create: validItems.map((item: { productId: string; qty: number; unitCost: number }) => ({
            productId: item.productId,
            qty: Number(item.qty) || 0,
            unitCost: Number(item.unitCost) || 0,
          })),
        },
      },
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

    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    console.error("Purchases API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create purchase" },
      { status: 500 }
    );
  }
}