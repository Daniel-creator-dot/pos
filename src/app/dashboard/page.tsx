"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Package,
  ShoppingCart,
  ArrowRight,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
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
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-slate-500">Loading the shop...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const top = stats?.topProducts ?? [];
  const maxSold = Math.max(1, ...top.map((product) => product.totalSold));
  const cards = [
    {
      label: "Today's sales",
      value: formatCurrency(stats?.todaySales ?? 0, currency),
      icon: DollarSign,
      tone: "bg-emerald-500",
    },
    {
      label: "Today's profit",
      value: formatCurrency(stats?.todayProfit ?? 0, currency),
      icon: TrendingUp,
      tone: "bg-sky-500",
    },
    {
      label: "Orders",
      value: String(stats?.todayOrders ?? 0),
      icon: ShoppingCart,
      tone: "bg-indigo-500",
    },
    {
      label: "Low on the shop floor",
      value: String(stats?.lowStockItems ?? 0),
      icon: AlertTriangle,
      tone: "bg-rose-500",
    },
  ];

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-slate-100">
        <header className="bg-slate-950 text-white px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Shop floor</p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">
                {session?.user?.name || "Dashboard"}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                {format(new Date(), "EEEE, MMMM d")} · {stats?.totalProducts ?? 0} products
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/pos" className="inline-flex items-center gap-2 bg-white text-slate-950 rounded-xl px-4 h-11 font-semibold">
                Open register <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/stock" className="inline-flex items-center gap-2 bg-white/10 text-white rounded-xl px-4 h-11 font-semibold">
                <Database className="w-4 h-4" /> Stock
              </Link>
              <Link href="/products" className="inline-flex items-center gap-2 bg-white/10 text-white rounded-xl px-4 h-11 font-semibold">
                <Package className="w-4 h-4" /> Products
              </Link>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${card.tone} text-white flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1">{card.value}</p>
                </article>
              );
            })}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">What is selling</h2>
              <p className="text-sm text-slate-500 mb-4">Units sold, longest bar is the leader</p>
              {top.length === 0 ? (
                <p className="text-slate-500 py-10 text-center">No sales yet. The register will fill this chart.</p>
              ) : (
                <ul className="space-y-4">
                  {top.map((product) => (
                    <li key={product.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-slate-900">{product.name}</span>
                        <span className="text-slate-500">
                          {product.totalSold} · {formatCurrency(product.revenue, currency)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-600 to-sky-400"
                          style={{ width: `${Math.max(8, (product.totalSold / maxSold) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Latest tickets</h2>
              <p className="text-sm text-slate-500 mb-4">Newest sale at the top</p>
              {(stats?.recentSales ?? []).length === 0 ? (
                <p className="text-slate-500 py-10 text-center">No tickets today.</p>
              ) : (
                <ul className="space-y-3">
                  {stats?.recentSales.map((sale) => (
                    <li key={sale.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{sale.user?.name ?? "Register"}</p>
                        <p className="text-xs text-slate-500">{format(new Date(sale.createdAt), "h:mm a")}</p>
                      </div>
                      <p className="font-bold text-slate-950">{formatCurrency(sale.total, currency)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
