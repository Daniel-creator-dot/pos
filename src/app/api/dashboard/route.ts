import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dynamic import of Prisma
    const { prisma } = await import("@/lib/prisma");

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get today's sales
    const todaySalesResult = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    const todaySales = todaySalesResult._sum.total || 0;
    const todayOrders = todaySalesResult._count.id || 0;

    // Get all active products and filter for low stock
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stockQty: true,
        lowStockThreshold: true,
      },
    });

    const lowStockItems = products.filter(
      (p: { stockQty: number; lowStockThreshold: number }) =>
        p.stockQty <= p.lowStockThreshold
    ).length;

    // Get total products
    const totalProducts = products.length;

    // Get top products by sales
    const topProductsResult = await prisma.saleItem.findMany({
      select: {
        productId: true,
        qty: true,
        subtotal: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group by product and sum quantities
    const productSales: Record<
      string,
      { name: string; totalSold: number; revenue: number }
    > = {};
    topProductsResult.forEach((item: any) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          name: item.product.name,
          totalSold: 0,
          revenue: 0,
        };
      }
      productSales[item.productId].totalSold += item.qty || 0;
      productSales[item.productId].revenue += item.subtotal || 0;
    });

    // Sort by totalSold and take top 5
    const formattedTopProducts = Object.values(productSales)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Get recent sales
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      todaySales,
      todayOrders,
      lowStockItems,
      totalProducts,
      topProducts: formattedTopProducts,
      recentSales,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}