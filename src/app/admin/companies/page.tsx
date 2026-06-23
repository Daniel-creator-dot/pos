"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Plus, Building2, Users, ShoppingBag, 
  Store, Globe, Mail, Phone, MapPin, 
  ChevronRight, Search, LayoutDashboard,
  LogOut, Settings, ShieldCheck, Key,
  MoreVertical, Trash2, Edit3, X, Menu,
  UserPlus, Check, AlertCircle, RefreshCw,
  TrendingUp, BarChart3, Activity, Shield,
  ArrowLeft, ExternalLink
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  _count: {
    stores: number;
    users: number;
    products: number;
  };
  stores?: any[];
  users?: any[];
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: {
    name: string;
  };
  company: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function SuperadminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState<"companies" | "users" | "products" | "stats" | "settings">("companies");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Drill-down State
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [platformStats, setPlatformStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalStores: 0
  });
  
  // Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form States
  const [companyForm, setCompanyForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "zxcv123$$", roleId: "", companyId: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Stores management states
  const [isStoresModalOpen, setIsStoresModalOpen] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "" });

  const [products, setProducts] = useState<any[]>([]);
  const [companyFilter, setCompanyFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || (session && session.user.role.name !== "superadmin")) {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, session, router, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "companies") {
        const res = await fetch("/api/companies");
        const data = await res.json();
        setCompanies(data);

        // Also fetch all products for drill-down and inventory count
        const prodRes = await fetch("/api/products");
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData);
        }
      } else if (activeTab === "users") {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
      } else if (activeTab === "products") {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data);
        
        // Ensure companies are loaded for the filter dropdown
        const compRes = await fetch("/api/companies");
        if (compRes.ok) {
          const compData = await compRes.json();
          setCompanies(compData);
        }
      } else if (activeTab === "stats") {
        const res = await fetch("/api/companies");
        const data = await res.json();
        const stats = data.reduce((acc: any, curr: any) => ({
          totalCompanies: acc.totalCompanies + 1,
          totalUsers: acc.totalUsers + (curr._count?.users || 0),
          totalProducts: acc.totalProducts + (curr._count?.products || 0),
          totalStores: acc.totalStores + (curr._count?.stores || 0)
        }), { totalCompanies: 0, totalUsers: 0, totalProducts: 0, totalStores: 0 });
        setPlatformStats(stats);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies";
      const method = editingCompany ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setIsCompanyModalOpen(false);
        setCompanyForm({ name: "", email: "", phone: "", address: "" });
        setEditingCompany(null);
        
        if (viewingCompany && viewingCompany.id === updated.id) {
          setViewingCompany(updated);
        }
        
        fetchData();
      }
    } catch (err) {
      console.error("Error saving company:", err);
    }
  };

  const handleToggleCompanyStatus = async (company: Company) => {
    const isActivating = company.status !== 'ACTIVE';
    const action = isActivating ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} ${company.name}?`)) return;
    
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isActivating ? 'ACTIVE' : 'SUSPENDED' })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setViewingCompany(updated);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || `Failed to ${action} company`);
      }
    } catch (err) {
      console.error(`Error toggling company status:`, err);
    }
  };

  const fetchStores = async (companyId: string) => {
    setLoadingStores(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/stores`);
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    try {
      const url = `/api/companies/${viewingCompany.id}/stores`;
      const method = editingStore ? "PUT" : "POST";
      const payload = editingStore 
        ? { storeId: editingStore.id, ...storeForm }
        : storeForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStoreForm({ name: "", address: "", phone: "" });
        setEditingStore(null);
        fetchStores(viewingCompany.id);
        
        const compRes = await fetch("/api/companies");
        if (compRes.ok) {
          const comps = await compRes.json();
          setCompanies(comps);
          const updatedViewing = comps.find((c: any) => c.id === viewingCompany.id);
          if (updatedViewing) setViewingCompany(updatedViewing);
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save store");
      }
    } catch (err) {
      console.error("Error saving store:", err);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!viewingCompany) return;
    if (!confirm("Are you sure you want to delete this store?")) return;
    try {
      const res = await fetch(`/api/companies/${viewingCompany.id}/stores?storeId=${storeId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchStores(viewingCompany.id);
        const compRes = await fetch("/api/companies");
        if (compRes.ok) {
          const comps = await compRes.json();
          setCompanies(comps);
          const updatedViewing = comps.find((c: any) => c.id === viewingCompany.id);
          if (updatedViewing) setViewingCompany(updatedViewing);
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to delete store");
      }
    } catch (err) {
      console.error("Error deleting store:", err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      
      const payload = {
        name: userForm.name,
        email: userForm.email,
        roleId: userForm.roleId,
        companyId: userForm.companyId || undefined,
        phone: userForm.phone,
        ...(editingUser ? {} : { password: userForm.password })
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsUserModalOpen(false);
        setEditingUser(null);
        setUserForm({ name: "", email: "", password: "zxcv123$$", roleId: "", companyId: "", phone: "" });
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save user");
      }
    } catch (err) {
      console.error("Error saving user:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, email: selectedUser.email, name: selectedUser.name })
      });
      if (res.ok) {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setSelectedUser(null);
        alert("Password reset successfully!");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
    }
  };

  const filteredData = activeTab === "companies" 
    ? companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTab === "users" 
      ? users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      : activeTab === "products"
        ? products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCompany = !companyFilter || p.companyId === companyFilter;
            return matchesSearch && matchesCompany;
          })
        : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Mobile Nav Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[60] flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <span className="font-black text-lg tracking-tight text-slate-900">SWIFTPOS</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 shadow-xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-slate-900 bg-clip-text text-transparent">
              SWIFTPOS
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-20 lg:py-4 space-y-2">
          <button 
            onClick={() => { setActiveTab("companies"); setViewingCompany(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "companies" ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}
          >
            <Building2 className="w-5 h-5" /> Companies
          </button>
          <button 
            onClick={() => { setActiveTab("users"); setViewingCompany(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "users" ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}
          >
            <Users className="w-5 h-5" /> All Users
          </button>
          <button 
            onClick={() => { setActiveTab("products"); setViewingCompany(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "products" ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}
          >
            <ShoppingBag className="w-5 h-5" /> Store Items
          </button>
          <button 
            onClick={() => { setActiveTab("stats"); setViewingCompany(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "stats" ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Platform Stats
          </button>
          <button 
            onClick={() => { setActiveTab("settings"); setViewingCompany(null); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "settings" ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'}`}
          >
            <Settings className="w-5 h-5" /> Global Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="px-4 py-3 mb-4 bg-slate-50 rounded-xl border border-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Superadmin</p>
            <p className="text-sm font-bold text-slate-700 truncate">{session?.user?.email}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500/70 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition-all group"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64 blur-sm lg:blur-none' : 'lg:pl-64'} pt-16 lg:pt-0`}>
        <header className="px-6 lg:px-10 flex flex-col lg:flex-row items-center justify-between border-b border-slate-200 sticky top-16 lg:top-0 bg-white/80 backdrop-blur-md z-40 gap-4 py-6 lg:py-0 h-auto lg:h-20 shadow-sm lg:shadow-none">
          <div className="flex items-center gap-4">
            {viewingCompany && (
              <button onClick={() => setViewingCompany(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 capitalize">
                {viewingCompany ? viewingCompany.name : `${activeTab.replace("-", " ")} Management`}
              </h1>
              <p className="text-sm text-slate-500">
                {viewingCompany ? `Detailed view of ${viewingCompany.name}` : `Manage platform-wide ${activeTab}`}
              </p>
            </div>
          </div>

          {!viewingCompany && (activeTab === "companies" || activeTab === "users" || activeTab === "products") && (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab === "products" ? "store items" : activeTab}...`} 
                  className="bg-slate-100 border-slate-200 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none w-full text-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {activeTab !== "products" && (
                <button 
                  onClick={() => {
                    if (activeTab === "companies") {
                      setCompanyForm({ name: "", email: "", phone: "", address: "" });
                      setIsCompanyModalOpen(true);
                    } else {
                      setEditingUser(null);
                      setUserForm({ name: "", email: "", password: "zxcv123$$", roleId: "", companyId: "", phone: "" });
                      setIsUserModalOpen(true);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 w-full sm:w-auto"
                >
                  {activeTab === "companies" ? <Building2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  Add {activeTab === "companies" ? "Company" : "User"}
                </button>
              )}
            </div>
          )}
        </header>

        <div className="p-6 lg:p-10">
          {loading && activeTab !== "settings" ? (
            <div className="py-20 flex justify-center">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          ) : viewingCompany ? (
            /* Company Drill-down View */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Company Info Card */}
                  <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100">
                          <Building2 className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black text-slate-900">{viewingCompany.name}</h2>
                          <p className="text-slate-500 flex items-center gap-2 mt-1">
                            <Globe className="w-4 h-4" /> {viewingCompany.email || 'No business email'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                        viewingCompany.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {viewingCompany.status}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-slate-50 rounded-lg"><Phone className="w-4 h-4" /></div>
                          <span className="text-sm font-medium">{viewingCompany.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-slate-50 rounded-lg"><MapPin className="w-4 h-4" /></div>
                          <span className="text-sm font-medium leading-relaxed">{viewingCompany.address || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-black text-indigo-400 mb-1">Company Secret Key</p>
                        <p className="text-sm font-mono font-bold text-indigo-600 truncate">CPY-{viewingCompany.id.split('-')[0].toUpperCase()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Company Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Stores</p>
                      <p className="text-3xl font-black text-slate-900">{viewingCompany._count?.stores || 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Employees</p>
                      <p className="text-3xl font-black text-slate-900">{viewingCompany._count?.users || 0}</p>
                    </div>
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Products</p>
                      <p className="text-3xl font-black text-slate-900">{viewingCompany._count?.products || 0}</p>
                    </div>
                  </div>

                  {/* Company Products List */}
                  <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-indigo-600" /> Company Inventory ({products.filter(p => p.companyId === viewingCompany.id).length})
                    </h3>
                    {products.filter(p => p.companyId === viewingCompany.id).length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No products configured for this company.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-96 overflow-y-auto pr-1">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500">
                              <th className="pb-3 text-xs font-black uppercase tracking-widest">Name</th>
                              <th className="pb-3 text-xs font-black uppercase tracking-widest">Barcode</th>
                              <th className="pb-3 text-xs font-black uppercase tracking-widest">Category</th>
                              <th className="pb-3 text-xs font-black uppercase tracking-widest">Selling Price</th>
                              <th className="pb-3 text-xs font-black uppercase tracking-widest">Stock Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.filter(p => p.companyId === viewingCompany.id).map((prod) => (
                              <tr key={prod.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 font-bold text-slate-950">{prod.name}</td>
                                <td className="py-3 font-mono text-slate-650">{prod.barcode || "N/A"}</td>
                                <td className="py-3 text-slate-600 font-medium">{prod.category?.name || "Uncategorized"}</td>
                                <td className="py-3 text-indigo-600 font-bold">${prod.price.toFixed(2)}</td>
                                <td className="py-3">
                                  <span className={`font-bold ${prod.stockQty <= prod.lowStockThreshold ? "text-rose-600" : "text-slate-900"}`}>
                                    {prod.stockQty} {prod.stockQty <= prod.lowStockThreshold && "⚠️"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Quick Actions */}
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
                    <h3 className="text-lg font-bold mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          setEditingCompany(viewingCompany);
                          setCompanyForm({
                            name: viewingCompany.name,
                            email: viewingCompany.email || "",
                            phone: viewingCompany.phone || "",
                            address: viewingCompany.address || "",
                          });
                          setIsCompanyModalOpen(true);
                        }}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Edit Company
                      </button>
                      <button 
                        onClick={() => {
                          fetchStores(viewingCompany.id);
                          setIsStoresModalOpen(true);
                        }}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Store className="w-4 h-4 group-hover:scale-110 transition-transform" /> Manage Stores
                      </button>
                      <button 
                        onClick={() => handleToggleCompanyStatus(viewingCompany)}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          viewingCompany.status === 'ACTIVE' 
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" /> {viewingCompany.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Meta Info */}
                  <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Registry Details</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Joined</span>
                        <span className="font-bold">{new Date(viewingCompany.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">ID</span>
                        <span className="font-mono text-[10px] text-slate-400">{viewingCompany.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "companies" ? (
            /* Companies Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredData.map((company: any) => (
                <div 
                  key={company.id} 
                  onClick={() => setViewingCompany(company)}
                  className="bg-white border border-slate-200 p-6 rounded-3xl hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer relative overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors border border-slate-100">
                      <Building2 className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      company.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {company.status}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">{company.name}</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
                      <Mail className="w-3.5 h-3.5" /> {company.email || 'No email'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Phone className="w-3.5 h-3.5" /> {company.phone || 'No phone'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 transition-all">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Stores</p>
                      <p className="text-lg font-bold text-slate-900">{company._count?.stores || 0}</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Users</p>
                      <p className="text-lg font-bold text-slate-900">{company._count?.users || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">SKUs</p>
                      <p className="text-lg font-bold text-slate-900">{company._count?.products || 0}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-600">
                    <span>Joined {new Date(company.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "users" ? (
            /* Users Table */
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Company</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Role</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Joined</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData as User[]).map((user) => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {user.phone || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium">{user.company?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            user.role?.name === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                            user.role?.name === 'superadmin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {user.role?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setUserForm({
                                  name: user.name,
                                  email: user.email,
                                  password: "",
                                  roleId: user.role?.name || "",
                                  companyId: user.company?.id || "",
                                  phone: user.phone || ""
                                });
                                setIsUserModalOpen(true);
                              }}
                              className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                              title="Edit User"
                            >
                              <Edit3 className="w-4.5 h-4.5" />
                            </button>
                            <button 
                              onClick={() => { setSelectedUser(user); setIsPasswordModalOpen(true); }}
                              className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "products" ? (
            /* Products Table */
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-800">Filter by Company:</span>
                </div>
                <select 
                  className="w-full sm:w-64 bg-slate-50 border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Product / SKU</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Barcode</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Category</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Company / Org</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Cost Price</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Selling Price</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Stock Qty</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((product: any) => (
                        <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900">{product.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{product.id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-600">
                            {product.barcode || "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                            {product.category?.name || "Uncategorized"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-slate-950 font-bold text-sm">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {product.company?.name || "Platform"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                            ${product.cost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-indigo-600 font-bold">
                            ${product.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-black ${
                              product.stockQty <= product.lowStockThreshold 
                                ? "text-rose-600" 
                                : "text-slate-900"
                            }`}>
                              {product.stockQty} {product.stockQty <= product.lowStockThreshold && "⚠️"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              product.isActive 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                : "bg-slate-50 text-slate-600 border border-slate-100"
                            }`}>
                              {product.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === "stats" ? (
            /* Platform Stats View */
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Companies", value: platformStats.totalCompanies, icon: Building2, color: "indigo" },
                  { label: "Total Users", value: platformStats.totalUsers, icon: Users, color: "emerald" },
                  { label: "Total Stores", value: platformStats.totalStores, icon: Store, color: "amber" },
                  { label: "Total Products", value: platformStats.totalProducts, icon: ShoppingBag, color: "purple" }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
                    <div className={`w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100`}>
                      <stat.icon className={`w-6 h-6 text-indigo-600`} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{stat.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                    <Activity className="w-5 h-5 text-indigo-600" /> System Health
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-600">Database Status</span>
                      <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-600">API Latency</span>
                      <span className="text-slate-900 font-bold text-sm">24ms</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-600">Storage Usage</span>
                      <span className="text-slate-900 font-bold text-sm">1.2 GB / 10 GB</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                    <TrendingUp className="w-5 h-5 text-emerald-600" /> Growth
                  </h3>
                  <div className="h-48 flex items-end justify-between gap-2 px-2">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-indigo-100 rounded-t-lg relative group transition-all hover:bg-indigo-200" style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">+{h}%</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Settings View */
            <div className="max-w-3xl space-y-8">
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900">
                  <Globe className="w-5 h-5 text-indigo-600" /> Platform Configuration
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Name</label>
                    <input className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" defaultValue="SwiftPOS SaaS" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Maintenance Mode</p>
                      <p className="text-xs text-slate-500">Disable platform access for regular users</p>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer p-1">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">Allow Self-Registration</p>
                      <p className="text-xs text-slate-500">Enable new companies to sign up themselves</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer p-1 flex justify-end">
                      <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-600">
                  <Shield className="w-5 h-5" /> Danger Zone
                </h3>
                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4">
                  <p className="text-sm text-slate-600 font-medium">Actions in this area are irreversible and affect all tenants.</p>
                  <button className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-95">Flush System Cache</button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab !== "stats" && activeTab !== "settings" && filteredData.length === 0 && !viewingCompany && (
            <div className="py-20 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No data found</h3>
              <p className="text-slate-500">Refine your search or add a new entry</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); setCompanyForm({ name: "", email: "", phone: "", address: "" }); }}></div>
          <div className="relative bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-10">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" /> {editingCompany ? "Edit Company" : "New Company"}
              </h2>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Company Name</label>
                  <input required className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input type="email" className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone</label>
                    <input className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Address</label>
                  <textarea rows={2} className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-900" value={companyForm.address} onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); setCompanyForm({ name: "", email: "", phone: "", address: "" }); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold order-2 sm:order-1">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold order-1 sm:order-2 shadow-lg shadow-indigo-500/20">{editingCompany ? "Update" : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }}></div>
          <div className="relative bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-10">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-600" /> {editingUser ? "Edit User" : "New User"}
              </h2>
              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                  <input required className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
                    <input required type="email" className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone Number</label>
                    <input required type="tel" className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" placeholder="e.g. 0244123456" value={userForm.phone} onChange={(e) => setUserForm({...userForm, phone: e.target.value})} />
                  </div>
                </div>
                {!editingUser && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
                    <input required type="password" className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} />
                    <p className="text-[10px] text-slate-400 ml-1 italic">Default: zxcv123$$</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Company</label>
                    <select 
                      required={userForm.roleId !== 'superadmin'}
                      disabled={userForm.roleId === 'superadmin'}
                      className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed" 
                      value={userForm.roleId === 'superadmin' ? '' : userForm.companyId} 
                      onChange={(e) => setUserForm({...userForm, companyId: e.target.value})}
                    >
                      <option value="">{userForm.roleId === 'superadmin' ? 'Platform Wide' : 'Select Company'}</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Role</label>
                    <select required className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-slate-900" value={userForm.roleId} onChange={(e) => setUserForm({...userForm, roleId: e.target.value})}>
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => { setIsUserModalOpen(false); setEditingUser(null); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold order-2 sm:order-1">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold order-1 sm:order-2 shadow-lg shadow-indigo-500/20">{editingUser ? "Update" : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="relative bg-white border border-slate-200 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                <Key className="w-6 h-6 text-indigo-600" /> Reset Password
              </h2>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input required type="password" className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20">Reset</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isStoresModalOpen && viewingCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsStoresModalOpen(false); setEditingStore(null); setStoreForm({ name: "", address: "", phone: "" }); }}></div>
          <div className="relative bg-white border border-slate-200 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Store className="w-6 h-6 text-indigo-600" /> Manage Stores - {viewingCompany.name}
                </h2>
                <button 
                  onClick={() => { setIsStoresModalOpen(false); setEditingStore(null); setStoreForm({ name: "", address: "", phone: "" }); }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Store creation/editing inline form */}
              <div className="bg-slate-50 border border-slate-150 p-6 rounded-3xl mb-8">
                <h3 className="text-sm font-bold text-slate-800 mb-4">
                  {editingStore ? "Edit Store" : "Add New Store"}
                </h3>
                <form onSubmit={handleSaveStore} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Store Name</label>
                      <input 
                        required 
                        className="w-full bg-white border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm" 
                        value={storeForm.name} 
                        onChange={(e) => setStoreForm({...storeForm, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone</label>
                      <input 
                        className="w-full bg-white border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm" 
                        value={storeForm.phone} 
                        onChange={(e) => setStoreForm({...storeForm, phone: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Address</label>
                      <input 
                        className="w-full bg-white border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 text-sm" 
                        value={storeForm.address} 
                        onChange={(e) => setStoreForm({...storeForm, address: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    {editingStore && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingStore(null); setStoreForm({ name: "", address: "", phone: "" }); }} 
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 transition-colors"
                    >
                      {editingStore ? "Update Store" : "Add Store"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Stores list */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Current Stores</h3>
                {loadingStores ? (
                  <div className="py-8 text-center text-slate-500 text-sm">Loading stores...</div>
                ) : stores.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">No stores configured.</div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {stores.map((store) => (
                      <div key={store.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-350 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{store.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {store.phone && `📞 ${store.phone}`} {store.address && `📍 ${store.address}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingStore(store);
                              setStoreForm({
                                name: store.name,
                                phone: store.phone || "",
                                address: store.address || "",
                              });
                            }}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                            title="Edit Store"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteStore(store.id)}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                            title="Delete Store"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
