"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Check, X, ShieldAlert, FileText, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { useToast, ToastContainer } from "@/components/Toast";

interface DeletionRequest {
  id: string;
  companyId: string;
  resourceType: "PRODUCT" | "CATEGORY" | "SUPPLIER";
  resourceId: string;
  resourceName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: {
    name: string;
    email: string;
    role: {
      name: string;
    };
  };
  createdAt: string;
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession();
  const { toasts, success, error: showError, removeToast } = useToast();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role?.name === "admin" || session?.user?.role?.name === "superadmin";

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/approvals");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        showError("Error", "Failed to fetch approvals inbox");
      }
    } catch (err) {
      console.error("Failed to load approvals:", err);
      showError("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        success(
          action === "APPROVE" ? "Deletion Approved" : "Deletion Rejected",
          `The request has been ${action === "APPROVE" ? "approved and the item has been soft-deleted" : "rejected and the item has been restored"} successfully.`
        );
        // Remove item from state
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        const errData = await response.json();
        showError("Error", errData.error || "Failed to process action");
      }
    } catch (err) {
      console.error("Failed to process approval action:", err);
      showError("Error", "Failed to connect to the server");
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading Approvals...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-500 mt-2 max-w-md">
            You do not have administrative privileges to access the Deletion Approvals Panel.
          </p>
        </div>
      </AuthenticatedLayout>
    );
  }

  const getResourceTypeBadge = (type: string) => {
    switch (type) {
      case "PRODUCT":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CATEGORY":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "SUPPLIER":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Deletions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve or reject soft-delete requests initiated by store managers.
            </p>
          </div>
        </header>

        {/* Main Section */}
        <main className="p-6 max-w-7xl mx-auto">
          {requests.length === 0 ? (
            <div className="card text-center py-16 px-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Inbox is Clean!</h2>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                No deletion requests are currently pending approval. Everything is running smoothly.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Resource Type</th>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Requested By</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getResourceTypeBadge(req.resourceType)}`}>
                            {req.resourceType}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-semibold text-gray-900">{req.resourceName}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{req.resourceId}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-medium text-gray-900">{req.requestedBy?.name}</div>
                          <div className="text-xs text-gray-500">
                            {req.requestedBy?.email} • <span className="capitalize text-primary-600 font-medium">{req.requestedBy?.role?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-gray-500">
                          {format(new Date(req.createdAt), "MMM d, yyyy")}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(req.createdAt), "h:mm a")}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(req.id, "REJECT")}
                              disabled={processingId !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 disabled:opacity-50 transition-all font-medium text-xs scale-100 active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleAction(req.id, "APPROVE")}
                              disabled={processingId !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 disabled:opacity-50 transition-all font-medium text-xs scale-100 active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthenticatedLayout>
  );
}
