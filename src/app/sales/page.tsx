"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Eye, Receipt, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

interface Sale {
  id: string;
  receiptNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  saleItems: {
    id: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
    };
  }[];
  payments: {
    id: string;
    method: string;
    amount: number;
    reference?: string;
  }[];
}

export default function SalesHistoryPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetchSettings();
    fetchSales();
  }, [startDate, endDate]);

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

  const fetchSales = async () => {
    try {
      let url = "/api/sales";
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSales(data);
      }
    } catch (error) {
      console.error("Failed to fetch sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) =>
    sale.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  if (selectedSale) {
    return (
      <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setSelectedSale(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Sales
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Sale Details - {selectedSale.receiptNumber}
          </h1>
        </header>

        <main className="p-6 max-w-4xl mx-auto">
          <div className="card">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">Receipt Details</h2>
                  <p className="text-sm text-gray-500">
                    {format(new Date(selectedSale.createdAt), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Cashier</p>
                  <p className="font-medium">
                    {selectedSale.user?.name || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-content">
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.saleItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.product.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.qty}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.unitPrice, currency)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.subtotal, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Payments</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.method.replace("_", " ")}
                            {payment.method === "MOBILE_MONEY" && payment.reference && ` (${payment.reference})`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(payment.amount, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(selectedSale.subtotal, currency)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({selectedSale.discount}%):</span>
                      <span className="font-medium text-red-600">-{formatCurrency(selectedSale.subtotal * selectedSale.discount / 100, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedSale.total, currency)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => window.print()} className="btn btn-primary flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Print Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Print-only thermal receipt container */}
          <div className="receipt-print hidden print:block bg-white p-4 font-mono text-sm text-gray-900">
            <div className="text-center mb-4">
              <p className="font-bold text-lg">SwiftPOS</p>
              <p className="text-xs text-gray-500">
                Receipt: {selectedSale.receiptNumber}
              </p>
              <p className="text-xs text-gray-500">
                {format(new Date(selectedSale.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </div>

            <div className="border-t border-b border-gray-300 py-2 mb-2">
              {selectedSale.saleItems.map((item) => (
                <div key={item.id} className="flex justify-between py-1">
                  <span>
                    {item.product.name} x{item.qty}
                  </span>
                  <span>{formatCurrency(item.subtotal, currency)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal, currency)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({selectedSale.discount}%):</span>
                  <span>-{formatCurrency(selectedSale.subtotal * selectedSale.discount / 100, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1 mt-1">
                <span>Total:</span>
                <span>{formatCurrency(selectedSale.total, currency)}</span>
              </div>
            </div>

            <div className="border-t border-gray-300 mt-2 pt-2">
              {selectedSale.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-xs">
                  <span>
                    {payment.method === "MOBILE_MONEY" 
                      ? `Mobile Money (${payment.reference || ""})` 
                      : payment.method.replace("_", " ")}:
                  </span>
                  <span>{formatCurrency(payment.amount, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold mt-1 text-sm">
                <span>Change:</span>
                <span>
                  {formatCurrency(
                    selectedSale.payments.reduce((s, p) => s + p.amount, 0) - selectedSale.total,
                    currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage all sales transactions</p>
          </div>
          <Link href="/pos" className="btn btn-primary flex items-center gap-2">
            <Package className="w-4 h-4" />
            New Sale
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="card mb-6">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="label block mb-1 text-xs">Receipt Number</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search receipt number..."
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="label block mb-1 text-xs">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label block mb-1 text-xs">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSearchQuery("");
                  }}
                  className="btn btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales, currency)}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{filteredSales.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Average Sale</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredSales.length > 0 ? formatCurrency(totalSales / filteredSales.length, currency) : formatCurrency(0, currency)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No sales found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{sale.receiptNumber || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.user?.name || "Unknown"}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.saleItems.length}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(sale.total, currency)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSale(sale);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </AuthenticatedLayout>
  );
}