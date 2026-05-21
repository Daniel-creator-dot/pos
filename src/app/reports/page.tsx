"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { BarChart3, DollarSign, ShoppingCart, Package, TrendingUp, Download } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  lowStockItems: number;
  salesByCategory: { category: string; total: number }[];
  topProducts: { name: string; totalSold: number; revenue: number }[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetchSettings();
    fetchReportData();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setCurrency(data.currency || "USD");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchReportData = async () => {
    setIsGenerating(true);
    try {
      let url = "/api/reports";
      const params = new URLSearchParams();
      if (dateRange.start) params.append("start", dateRange.start);
      if (dateRange.end) params.append("end", dateRange.end);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "SwiftPOS Sales Report\n";
    csvContent += `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}\n\n`;
    csvContent += "SUMMARY\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Sales,${formatCurrency(reportData.totalSales, currency)}\n`;
    csvContent += `Total Orders,${reportData.totalOrders}\n`;
    csvContent += `Total Products,${reportData.totalProducts}\n`;
    csvContent += `Low Stock Items,${reportData.lowStockItems}\n\n`;
    csvContent += "TOP PRODUCTS\n";
    csvContent += "Product Name,Units Sold,Revenue\n";
    reportData.topProducts.forEach((product) => {
      csvContent += `${product.name},${product.totalSold},${formatCurrency(product.revenue, currency)}\n`;
    });
    csvContent += "\n";
    csvContent += "SALES BY CATEGORY\n";
    csvContent += "Category,Total Sales\n";
    reportData.salesByCategory.forEach((item) => {
      csvContent += `${item.category},${formatCurrency(item.total, currency)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="text-gray-500">Loading...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-1">View sales and inventory analytics</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={!reportData || isGenerating}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>

        <div className="card mb-6">
          <div className="card-content">
            <div className="flex items-center gap-4">
              <div>
                <label className="label block mb-1 text-xs">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="input"
                />
              </div>
              <button
                onClick={fetchReportData}
                disabled={isGenerating}
                className="btn btn-primary mt-6 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-opacity duration-300 ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData?.totalSales ?? 0, currency)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{reportData?.totalOrders || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{reportData?.totalProducts || 0}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{reportData?.lowStockItems || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-300 ${isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top Products
              </h2>
            </div>
            <div className="card-content">
              {reportData?.topProducts && reportData.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {reportData.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">{product.totalSold} sold</span>
                        <span className="text-xs text-gray-500 ml-2">{formatCurrency(product.revenue, currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No data available. Click "Generate Report" to load data.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Sales by Category</h2>
            </div>
            <div className="card-content">
              {reportData?.salesByCategory && reportData.salesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {reportData.salesByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm font-medium text-gray-900">{item.category}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(item.total, currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No data available. Click "Generate Report" to load data.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthenticatedLayout>
  );
}