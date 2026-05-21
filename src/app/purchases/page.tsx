"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Truck, Plus, Eye, Package, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

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
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState({
    supplierId: "",
    items: [{ productId: "", qty: 1, unitCost: 0 }],
    notes: "",
  });
  const [currency, setCurrency] = useState("USD");

  const isAdmin = session?.user?.role?.name === "admin";
  const isManager = session?.user?.role?.name === "manager";
  const isStorekeeper = session?.user?.role?.name === "storekeeper";
  const isSuperAdmin = session?.user?.role?.name === "superadmin";
  const canCreate = isAdmin || isManager || isStorekeeper || isSuperAdmin;
  const canDelete = isAdmin || isSuperAdmin;

  useEffect(() => {
    fetchSettings();
    fetchData();
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

  const fetchData = async () => {
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/suppliers"),
        fetch("/api/products"),
      ]);

      if (purchasesRes.ok) {
        const data = await purchasesRes.json();
        setPurchases(data);
      }

      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data);
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.filter((p: any) => p.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: field === "qty" ? parseInt(value) || 0 : field === "unitCost" ? parseFloat(value) || 0 : value,
    };
    if (field === "productId") {
      const selectedProd = products.find((p) => p.id === value);
      if (selectedProd) {
        newItems[index].unitCost = selectedProd.cost || 0;
      }
    }
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: products[0]?.id || "", qty: 1, unitCost: products[0]?.cost || 0 }],
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase? This will revert any stock changes if the purchase was COMPLETED.")) {
      return;
    }
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete purchase");
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
      alert("Failed to delete purchase");
    }
  };

  const openCreateModal = () => {
    setFormData({
      supplierId: suppliers[0]?.id || "",
      items: [{ productId: products[0]?.id || "", qty: 1, unitCost: products[0]?.cost || 0 }],
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
                          {formatCurrency(purchase.total, currency)}
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
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(purchase.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete purchase"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="label font-semibold text-gray-700">Purchase Items *</label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-primary-600 hover:text-primary-800 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end border border-gray-100 p-2 rounded-lg bg-gray-50/50">
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                            className="input text-xs py-1"
                            required
                          >
                            <option value="">Select product</option>
                            {products.map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.name} (Stock: {prod.stockQty})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="w-20">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                            className="input text-xs py-1"
                            required
                          />
                        </div>

                        <div className="w-24">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Unit Cost</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(index, "unitCost", e.target.value)}
                            className="input text-xs py-1"
                            required
                          />
                        </div>

                        <div className="w-20 text-right pb-2 text-xs font-medium text-gray-500">
                          <span className="text-[10px] text-gray-400 block mb-0.5">Subtotal</span>
                          {formatCurrency(item.qty * item.unitCost, currency)}
                        </div>

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 p-1 mb-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">Total Purchase Cost:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(formData.items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0), currency)}
                  </span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Purchase Details</h2>
                <button onClick={() => setSelectedPurchase(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Supplier</p>
                    <p className="font-medium">{selectedPurchase.supplier.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{format(new Date(selectedPurchase.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      selectedPurchase.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : selectedPurchase.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {selectedPurchase.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="font-bold text-lg text-gray-900">{formatCurrency(selectedPurchase.total, currency)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-500 mb-2 font-medium">Purchase Items</p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Unit Cost</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPurchase.purchaseItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-gray-900">{item.product?.name || "Unknown Product"}</td>
                            <td className="px-3 py-2 text-gray-900 text-right">{item.qty}</td>
                            <td className="px-3 py-2 text-gray-900 text-right">{formatCurrency(item.unitCost, currency)}</td>
                            <td className="px-3 py-2 text-gray-900 text-right font-medium">{formatCurrency(item.qty * item.unitCost, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedPurchase.notes && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AuthenticatedLayout>
  );
}