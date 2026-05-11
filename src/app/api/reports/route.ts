import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    // Get total sales
    const totalSalesResult = await prisma.sale.aggregate({
      _sum: { total: true },
      _count: { id: true },
    });

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    });

    // Get low stock items
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { stockQty: true, lowStockThreshold: true },
    });
    const lowStockItems = products.filter(
      (p: { stockQty: number; lowStockThreshold: number }) =>
        p.stockQty <= p.lowStockThreshold
    ).length;

    // Get top products
    const saleItems = await prisma.saleItem.findMany({
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

    // Group by product
    const productMap: Record<
      string,
      { name: string; totalSold: number; revenue: number }
    > = {};
    saleItems.forEach((item: any) => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          name: item.product.name,
          totalSold: 0,
          revenue: 0,
        };
      }
      productMap[item.productId].totalSold += item.qty || 0;
      productMap[item.productId].revenue += item.subtotal || 0;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    // Get sales by category
    const saleItemsWithCategory = await prisma.saleItem.findMany({
      select: {
        productId: true,
        subtotal: true,
        product: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const categoryTotals: Record<string, number> = {};
    saleItemsWithCategory.forEach((item: any) => {
      const categoryName = item.product.category?.name || "Uncategorized";
      categoryTotals[categoryName] =
        (categoryTotals[categoryName] || 0) + (item.subtotal || 0);
    });

    const salesByCategory = Object.entries(categoryTotals).map(
      ([category, total]) => ({
        category,
        total,
      })
    );

    return NextResponse.json({
      totalSales: totalSalesResult._sum.total || 0,
      totalOrders: totalSalesResult._count.id || 0,
      totalProducts,
      lowStockItems,
      topProducts,
      salesByCategory,
    });
  } catch (error) {
    console.error("Reports API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}