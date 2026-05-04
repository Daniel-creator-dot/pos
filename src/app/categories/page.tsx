"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast, ToastContainer } from "@/components/Toast";

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { products: number };
}

export default function CategoriesPage() {
  const { data: session } = useSession();
  const { toasts, success, error: showError, removeToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = session?.user?.role?.name === "admin";
  const isManager = session?.user?.role?.name === "manager";
  const canEdit = isAdmin || isManager;

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      showError("Error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      if (response.ok) {
        fetchCategories();
        closeModal();
        success(
          editingCategory ? "Category Updated" : "Category Created",
          `Category "${formData.name}" has been ${editingCategory ? "updated" : "created"} successfully.`
        );
      } else {
        // Try to parse as JSON, otherwise use status text
        let errorMessage = `Failed to save category (${response.status})`;
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Ignore parsing error
          }
        }
        showError("Error", errorMessage);
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setCategoryToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/categories/${categoryToDelete}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCategories();
        success("Category Deleted", "The category has been deleted successfully.");
      } else {
        showError("Error", "Failed to delete category");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to delete category");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
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
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500 mt-1">Manage product categories</p>
            </div>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="card">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {category._count?.products || 0} products
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-1 text-gray-400 hover:text-primary-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(category.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No categories found</p>
            </div>
          )}
        </main>

        {/* Category Modal */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingCategory ? "Edit Category" : "Add Category"}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label block mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label block mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
              />
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
                  editingCategory ? "Update" : "Create"
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
            setCategoryToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Category"
          message="Are you sure you want to delete this category? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isLoading={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}