"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Truck, Plus, Eye, Package, X } from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

interface Purchase {
  id: string;
  supplierId: string;
  userId: string;
  total: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  supplier: { name: string };
  user: { name: string };
  purchaseItems: { qty: number; unitCost: number; product: { name: string } }[];
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export default function PurchasesPage() {
  const { data: session } = useSession();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState({
    supplierId: "",
    items: [{ productId: "", qty: 1, unitCost: 0 }],
    notes: "",
  });

  const isAdmin = session?.user?.role?.name === "admin";
  const isManager = session?.user?.role?.name === "manager";
  const isStorekeeper = session?.user?.role?.name === "storekeeper";
  const canCreate = isAdmin || isManager || isStorekeeper;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [purchasesRes, suppliersRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/suppliers"),
      ]);

      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(data);
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId: session?.user?.id,
        }),
      });

      if (response.ok) {
        fetchData();
        closeModal();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create purchase");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create purchase");
    }
  };

  const confirmPurchase = async (id: string) => {
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert("Failed to confirm purchase");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to confirm purchase");
    }
  };

  const openCreateModal = () => {
    setFormData({
      supplierId: suppliers[0]?.id || "",
      items: [{ productId: "", qty: 1, unitCost: 0 }],
      notes: "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
            <p className="text-sm text-gray-500 mt-1">Manage supplier purchases</p>
          </div>
          {canCreate && (
            <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Purchase
            </button>
          )}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Purchase History</h2>
          </div>
          <div className="card-content">
            {purchases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {format(new Date(purchase.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{purchase.supplier.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{purchase.purchaseItems.length} items</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          ${purchase.total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              purchase.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : purchase.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {purchase.status === "PENDING" && canCreate && (
                              <button
                                onClick={() => confirmPurchase(purchase.id)}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedPurchase(purchase)}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No purchases yet</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">New Purchase</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label block mb-1">Supplier *</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label block mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    Create Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Purchase Details</h2>
                <button onClick={() => setSelectedPurchase(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedPurchase.supplier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(new Date(selectedPurchase.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-medium text-lg">${selectedPurchase.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedPurchase.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : selectedPurchase.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {selectedPurchase.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AuthenticatedLayout>
  );
}