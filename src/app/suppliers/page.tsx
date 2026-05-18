"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast, ToastContainer } from "@/components/Toast";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  isPendingDelete?: boolean;
  createdBy?: {
    name: string;
    role: { name: string };
  } | null;
}

export default function SuppliersPage() {
  const { data: session } = useSession();
  const { toasts, success, error: showError, removeToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = session?.user?.role?.name === "admin";
  const isManager = session?.user?.role?.name === "manager";
  const isStorekeeper = session?.user?.role?.name === "storekeeper";
  const canEdit = isAdmin || isManager || isStorekeeper;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
      showError("Error", "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        fetchSuppliers();
        closeModal();
        success(
          editingSupplier ? "Supplier Updated" : "Supplier Created",
          `Supplier "${formData.name}" has been ${editingSupplier ? "updated" : "created"} successfully.`
        );
      } else {
        const errorData = await response.json();
        showError("Error", errorData.error || "Failed to save supplier");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to save supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setSupplierToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/suppliers/${supplierToDelete}`, {
        method: "DELETE",
      });
      if (response.ok) {
        const result = await response.json();
        fetchSuppliers();
        if (result.pendingApproval) {
          success(
            "Deletion Requested",
            "Your deletion request has been submitted for administrator approval."
          );
        } else {
          success("Supplier Deleted", "The supplier has been deleted successfully.");
        }
      } else {
        showError("Error", "Failed to delete supplier");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Error", "Failed to delete supplier");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSupplierToDelete(null);
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({ name: "", phone: "", email: "", address: "" });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
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
              <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
              <p className="text-sm text-gray-500 mt-1">Manage supplier contacts</p>
            </div>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className={`card relative overflow-hidden transition-all duration-200 ${supplier.isPendingDelete ? "border-amber-200 bg-amber-50/20" : ""}`}>
                {supplier.isPendingDelete && (
                  <div className="absolute top-0 right-0 left-0 bg-amber-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider shadow-sm">
                    Pending Delete Approval
                  </div>
                )}
                <div className={`p-4 ${supplier.isPendingDelete ? "pt-7" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                      {supplier.phone && (
                        <p className="text-sm text-gray-500 mt-1">Phone: {supplier.phone}</p>
                      )}
                      {supplier.email && (
                        <p className="text-sm text-gray-500">Email: {supplier.email}</p>
                      )}
                      {supplier.address && (
                        <p className="text-sm text-gray-500 mt-1">{supplier.address}</p>
                      )}
                      {supplier.createdBy && (
                        <p className="italic text-[10px] text-gray-400 mt-2">
                          Added by {supplier.createdBy.name} ({supplier.createdBy.role?.name})
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(supplier)}
                          disabled={supplier.isPendingDelete}
                          className={`p-1 rounded transition-colors ${supplier.isPendingDelete ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-primary-600 hover:bg-gray-100"}`}
                          title={supplier.isPendingDelete ? "Pending deletion approval" : "Edit"}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(supplier.id)}
                          disabled={supplier.isPendingDelete}
                          className={`p-1 rounded transition-colors ${supplier.isPendingDelete ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-red-600 hover:bg-gray-100"}`}
                          title={supplier.isPendingDelete ? "Pending deletion approval" : "Delete"}
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

          {suppliers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No suppliers found</p>
            </div>
          )}
        </main>

        {/* Supplier Modal */}
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
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
              <label className="label block mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label block mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label block mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                rows={2}
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
                  editingSupplier ? "Update" : "Create"
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
            setSupplierToDelete(null);
          }}
          onConfirm={handleDelete}
          title={isAdmin ? "Delete Supplier" : "Request Supplier Deletion"}
          message={
            isAdmin
              ? "Are you sure you want to delete this supplier? This action cannot be undone."
              : "As a store manager/storekeeper, deleting this supplier requires administrator approval. A deletion request will be submitted to the administrator. Proceed?"
          }
          confirmText={isAdmin ? "Delete" : "Submit Request"}
          cancelText="Cancel"
          type={isAdmin ? "danger" : "warning"}
          isLoading={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}