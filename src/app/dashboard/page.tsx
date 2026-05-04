"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  lowStockItems: number;
  totalProducts: number;
  topProducts: { name: string; totalSold: number; revenue: number }[];
  recentSales: {
    id: string;
    total: number;
    createdAt: string;
    user: { name: string } | null;
  }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [settingsRes, dashboardRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/dashboard"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setCurrency(data.currency || "USD");
        }

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {session?.user?.name}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Sales */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Today's Sales
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats?.todaySales ?? 0, currency)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Today's Orders */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Today's Orders
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.todayOrders ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Low Stock Alert
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.lowStockItems ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Products
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats?.totalProducts ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Products
              </h2>
            </div>
            <div className="card-content">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {stats.topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {product.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {product.totalSold} sold
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatCurrency(product.revenue, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  No sales data available
                </p>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recent Sales
              </h2>
            </div>
            <div className="card-content">
              {stats?.recentSales && stats.recentSales.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {sale.user?.name ?? "Unknown"}
                        </span>
                        <p className="text-xs text-gray-500">
                          {format(new Date(sale.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(sale.total, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  No recent sales
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
    </AuthenticatedLayout>
  );
}
