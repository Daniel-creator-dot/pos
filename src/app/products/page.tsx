"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast, ToastContainer } from "@/components/Toast";
import { formatCurrency } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  categoryId: string;
  price: number;
  cost: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const { toasts, success, error: showError, removeToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    categoryId: "",
    price: 0,
    cost: 0,
    stockQty: 0,
    lowStockThreshold: 5,
  });
  const [currency, setCurrency] = useState("USD");

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = session?.user?.role?.name === "admin";
  const isManager = session?.user?.role?.name === "manager";
  const canEdit = isAdmin || isManager;

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
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      showError("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchData();
        closeModal();
        success(
          editingProduct ? "Product Updated" : "Product Created",
          `Product "${formData.name}" has been ${editingProduct ? "updated" : "created"} successfully.`
        );
      } else {
        const errorData = await response.json();
        showError("Error", errorData.error || "Failed to save product");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setProductToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/products/${productToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
        success("Product Deleted", "The product has been deleted successfully.");
      } else {
        showError("Error", "Failed to delete product");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to delete product");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode || "",
      categoryId: product.categoryId,
      price: product.price,
      cost: product.cost,
      stockQty: product.stockQty,
      lowStockThreshold: product.lowStockThreshold,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      barcode: "",
      categoryId: categories[0]?.id || "",
      price: 0,
      cost: 0,
      stockQty: 0,
      lowStockThreshold: 5,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
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
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your product inventory
              </p>
            </div>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            )}
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          {/* Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  {lowStockProducts.length} product(s) are low on stock
                </p>
                <p className="text-sm text-red-600">
                  Products that need restocking
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="card mb-6">
            <div className="card-content">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name or barcode..."
                  className="input pl-10"
                />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.category?.name || "Uncategorized"}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(product.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {product.barcode && (
                    <p className="text-xs text-gray-500 mb-2">
                      Barcode: {product.barcode}
                    </p>
                  )}

                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(product.price, currency)}
                  </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        product.stockQty <= product.lowStockThreshold
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      Stock: {product.stockQty}
                    </span>
                  </div>

                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                  <span>Cost: {formatCurrency(product.cost, currency)}</span>
                    <span>
                      Added {format(new Date(product.createdAt), "MMM d")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No products found</p>
            </div>
          )}
        </main>

        {/* Product Modal */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingProduct ? "Edit Product" : "Add Product"}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label block mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input"
                required
              />
            </div>

            <div>
              <label className="label block mb-1">Barcode</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) =>
                  setFormData({ ...formData, barcode: e.target.value })
                }
                className="input"
              />
            </div>

            <div>
              <label className="label block mb-1">Category *</label>
              <select
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                className="input"
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1">Selling Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label block mb-1">Cost Price *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cost: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stockQty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stockQty: parseInt(e.target.value) || 0,
                    })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label block mb-1">Low Stock Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 5,
                    })
                  }
                  className="input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="btn btn-secondary flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  editingProduct ? "Update" : "Create"
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setProductToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Product"
          message="Are you sure you want to delete this product? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isLoading={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}