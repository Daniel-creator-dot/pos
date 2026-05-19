import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/sales - Create a new sale
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const body = await request.json();
    const { items, discount, payments, storeId, userId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    if (!storeId || !userId) {
      return NextResponse.json(
        { error: "Store and user information required" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Calculate subtotal
      const subtotal = items.reduce(
        (sum: number, item: { quantity: number; unitPrice: number }) =>
          sum + item.quantity * item.unitPrice,
        0
      );

      // Calculate discount amount
      const discountAmount = subtotal * (discount / 100);

      // Calculate total
      const total = subtotal - discountAmount;

      // Verify stock availability for all items
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.stockQty < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stockQty}`
          );
        }
      }

      // Generate receipt number
      const date = new Date();
      const receiptNumber = `RCP-${date.getFullYear()}${String(
        date.getMonth() + 1
      ).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(
        await tx.sale.count({
          where: {
            companyId: session.user.companyId,
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            },
          },
        }) + 1
      ).padStart(4, "0")}`;

      // Create the sale
      const sale = await tx.sale.create({
        data: {
          userId,
          storeId,
          companyId: session.user.companyId,
          subtotal,
          discount,
          total,
          receiptNumber,
          saleItems: {
            create: items.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
              productId: item.productId,
              qty: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            })),
          },
          payments: {
            create: payments.map((p: { method: string; amount: number; reference?: string }) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference,
            })),
          },
        },
        include: {
          saleItems: {
            include: {
              product: true,
            },
          },
          payments: true,
        },
      });

      // Update stock and create stock movements
      for (const item of items) {
        // Decrease stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQty: {
              decrement: item.quantity,
            },
          },
        });

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            qty: item.quantity,
            reason: "Sale",
            userId,
            reference: sale.id,
          },
        });
      }

      // Create receipt
      await tx.receipt.create({
        data: {
          saleId: sale.id,
          receiptNumber,
          format: "THERMAL",
        },
      });

      return sale;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sales API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete sale" },
      { status: 500 }
    );
  }
}

// GET /api/sales - List sales with optional filters
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const cashierId = searchParams.get("cashierId");

    // Build where clause
    const where: any = {
      ...(session.user.role.name !== "superadmin" ? { companyId: session.user.companyId } : {}),
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { lte: new Date(endDate) };
    }

    // Cashiers can only see their own sales
    if (session.user.role.name === "cashier") {
      where.userId = session.user.id;
    } else if (cashierId) {
      where.userId = cashierId;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Sales API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}