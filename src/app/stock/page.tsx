"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Database, AlertTriangle, ArrowUp, ArrowDown, Package } from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  stockQty: number;
  lowStockThreshold: number;
  category: { name: string } | null;
}

interface StockMovement {
  id: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  qty: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  user: { name: string } | null;
  product: { name: string };
}

export default function StockPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/stock"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }

      if (movementsRes.ok) {
        const data = await movementsRes.json();
        setMovements(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockProducts = products.filter(
    (p) => p.stockQty <= p.lowStockThreshold
  );

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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track inventory levels and movements</p>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                {lowStockProducts.length} product(s) are low on stock
              </p>
              <p className="text-sm text-red-600">Products that need restocking</p>
            </div>
          </div>
        )}

        {/* Stock Levels */}
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
          </div>
          <div className="card-content">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Low Threshold</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{product.category?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{product.stockQty}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{product.lowStockThreshold}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            product.stockQty <= product.lowStockThreshold
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {product.stockQty <= product.lowStockThreshold ? "Low Stock" : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock Movements */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h2>
          </div>
          <div className="card-content">
            {movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.slice(0, 10).map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{movement.product.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`flex items-center gap-1 ${
                              movement.type === "IN"
                                ? "text-green-600"
                                : movement.type === "OUT"
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          >
                            {movement.type === "IN" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : movement.type === "OUT" ? (
                              <ArrowDown className="w-4 h-4" />
                            ) : null}
                            {movement.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{movement.qty}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{movement.reason || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{movement.user?.name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(movement.createdAt), "MMM d, h:mm a")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No stock movements yet</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </AuthenticatedLayout>
  );
}