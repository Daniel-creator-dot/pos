import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkoutTotals } from "@/lib/checkout";

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

    let resolvedStoreId = storeId;
    if (!resolvedStoreId && session.user.companyId) {
      const companyStore = await prisma.store.findFirst({
        where: { companyId: session.user.companyId }
      });
      if (companyStore) {
        resolvedStoreId = companyStore.id;
      }
    }

    if (!resolvedStoreId || !userId) {
      return NextResponse.json(
        { error: "Store and user information required" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const pricedItems: {
        productId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      // Sell at the catalog price and only from the cashier's company.
      for (const item of items) {
        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            isActive: true,
            ...(session.user.role.name !== "superadmin"
              ? { companyId: session.user.companyId ?? null }
              : {}),
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.stockQty < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stockQty}`
          );
        }

        const unitPrice = Number(product.price);
        pricedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
        });
      }

      const subtotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);

      let taxRate = 0;
      if (resolvedStoreId) {
        const store = await tx.store.findUnique({
          where: { id: resolvedStoreId },
          select: { settings: true },
        });
        if (store?.settings) {
          try {
            taxRate = Number(JSON.parse(store.settings).taxRate) || 0;
          } catch {
            taxRate = 0;
          }
        }
      }

      const totals = checkoutTotals(subtotal, Number(discount) || 0, taxRate);
      const totalPaid = (payments || []).reduce(
        (sum: number, payment: { amount: number }) => sum + Number(payment.amount || 0),
        0
      );
      if (totalPaid + 0.001 < totals.total) {
        throw new Error("Insufficient payment amount");
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
          storeId: resolvedStoreId,
          companyId: session.user.companyId,
          subtotal,
          discount: totals.discountPercent,
          tax: totals.tax,
          total: totals.total,
          receiptNumber,
          saleItems: {
            create: pricedItems.map((item) => ({
              productId: item.productId,
              qty: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
          payments: {
            create: (payments || []).map((p: { method: string; amount: number; reference?: string }) => ({
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
      for (const item of pricedItems) {
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

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
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