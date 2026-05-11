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
  TrendingUp, BarChart3, Activity, Shield
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
}

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
  company: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function SuperadminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Dashboard State
  const [activeTab, setActiveTab] = useState<"companies" | "users" | "stats" | "settings">("companies");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
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
  
  // Form States
  const [companyForm, setCompanyForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", roleId: "", companyId: "" });
  const [newPassword, setNewPassword] = useState("");

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
      } else if (activeTab === "users") {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
      } else if (activeTab === "stats") {
        const res = await fetch("/api/companies");
        const data = await res.json();
        const stats = data.reduce((acc: any, curr: any) => ({
          totalCompanies: acc.totalCompanies + 1,
          totalUsers: acc.totalUsers + curr._count.users,
          totalProducts: acc.totalProducts + curr._count.products,
          totalStores: acc.totalStores + curr._count.stores
        }), { totalCompanies: 0, totalUsers: 0, totalProducts: 0, totalStores: 0 });
        setPlatformStats(stats);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm)
      });
      if (res.ok) {
        setIsCompanyModalOpen(false);
        setCompanyForm({ name: "", email: "", phone: "", address: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Error creating company:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm)
      });
      if (res.ok) {
        setIsUserModalOpen(false);
        setUserForm({ name: "", email: "", password: "", roleId: "", companyId: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Error creating user:", err);
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
      : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Mobile Nav Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 z-[60] flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-500" />
          <span className="font-black text-lg tracking-tight">SWIFTPOS</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-zinc-800 rounded-lg">
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Minimal Glassmorphism */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              SWIFTPOS
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-20 lg:py-4 space-y-2">
          <button 
            onClick={() => { setActiveTab("companies"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "companies" ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent'}`}
          >
            <Building2 className="w-5 h-5" /> Companies
          </button>
          <button 
            onClick={() => { setActiveTab("users"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "users" ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent'}`}
          >
            <Users className="w-5 h-5" /> All Users
          </button>
          <button 
            onClick={() => { setActiveTab("stats"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "stats" ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Platform Stats
          </button>
          <button 
            onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${activeTab === "settings" ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 border-transparent'}`}
          >
            <Settings className="w-5 h-5" /> Global Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="px-4 py-3 mb-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Superadmin</p>
            <p className="text-sm font-bold text-zinc-300 truncate">{session?.user?.email}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 rounded-xl font-medium transition-all group"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'lg:pl-64 blur-sm lg:blur-none' : 'lg:pl-64'} pt-16 lg:pt-0`}>
        <header className="px-6 lg:px-10 flex flex-col lg:flex-row items-center justify-between border-b border-zinc-800 sticky top-16 lg:top-0 bg-zinc-950/80 backdrop-blur-md z-40 gap-4 py-6 lg:py-0 h-auto lg:h-20">
          <div>
            <h1 className="text-2xl font-bold text-white capitalize">{activeTab.replace("-", " ")} Management</h1>
            <p className="text-sm text-zinc-500">Manage platform-wide {activeTab}</p>
          </div>

          {(activeTab === "companies" || activeTab === "users") && (
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`} 
                  className="bg-zinc-900 border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => activeTab === "companies" ? setIsCompanyModalOpen(true) : setIsUserModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 w-full sm:w-auto"
              >
                {activeTab === "companies" ? <Building2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                Add {activeTab === "companies" ? "Company" : "User"}
              </button>
            </div>
          )}
        </header>

        <div className="p-6 lg:p-10">
          {loading && activeTab !== "settings" ? (
            <div className="py-20 flex justify-center">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
          ) : activeTab === "companies" ? (
            /* Companies Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredData.map((company: any) => (
                <div key={company.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl hover:border-indigo-500/50 transition-all group cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <Building2 className="w-7 h-7 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      company.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {company.status}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{company.name}</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 truncate">
                      <Mail className="w-3.5 h-3.5" /> {company.email || 'No email'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Phone className="w-3.5 h-3.5" /> {company.phone || 'No phone'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 group-hover:border-indigo-500/20 transition-all">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-zinc-600 mb-1">Stores</p>
                      <p className="text-lg font-bold text-white">{company._count.stores}</p>
                    </div>
                    <div className="text-center border-x border-zinc-800">
                      <p className="text-[10px] uppercase font-bold text-zinc-600 mb-1">Users</p>
                      <p className="text-lg font-bold text-white">{company._count.users}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-zinc-600 mb-1">SKUs</p>
                      <p className="text-lg font-bold text-white">{company._count.products}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between text-xs font-bold text-zinc-500 group-hover:text-indigo-400">
                    <span>Joined {new Date(company.createdAt).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "users" ? (
            /* Users Table */
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">User</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Company</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Role</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest">Joined</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData as User[]).map((user) => (
                      <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-100">{user.name}</p>
                              <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-sm font-medium">{user.company?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            user.role?.name === 'admin' ? 'bg-amber-500/10 text-amber-500' : 
                            user.role?.name === 'superadmin' ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {user.role?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setSelectedUser(user); setIsPasswordModalOpen(true); }}
                              className="p-2 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-400 rounded-lg transition-all"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all">
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
                  <div key={idx} className={`bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] hover:border-zinc-700 transition-all`}>
                    <div className={`w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon className={`w-6 h-6 text-indigo-400`} />
                    </div>
                    <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                    <p className="text-3xl font-black text-white mt-1">{stat.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" /> System Health
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-zinc-400">Database Status</span>
                      <span className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-zinc-400">API Latency</span>
                      <span className="text-zinc-100 font-bold text-sm">24ms</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-zinc-400">Storage Usage</span>
                      <span className="text-zinc-100 font-bold text-sm">1.2 GB / 10 GB</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Growth
                  </h3>
                  <div className="h-48 flex items-end justify-between gap-2 px-2">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-lg relative group transition-all hover:bg-indigo-500/40" style={{ height: `${h}%` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">+{h}%</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-1">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Settings View */
            <div className="max-w-3xl space-y-8">
              <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-400" /> Platform Configuration
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Platform Name</label>
                    <input className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue="SwiftPOS SaaS" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                    <div>
                      <p className="font-bold">Maintenance Mode</p>
                      <p className="text-xs text-zinc-500">Disable platform access for regular users</p>
                    </div>
                    <div className="w-12 h-6 bg-zinc-800 rounded-full relative cursor-pointer p-1">
                      <div className="w-4 h-4 bg-zinc-600 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50">
                    <div>
                      <p className="font-bold">Allow Self-Registration</p>
                      <p className="text-xs text-zinc-500">Enable new companies to sign up themselves</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer p-1 flex justify-end">
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem]">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-red-400">
                  <Shield className="w-5 h-5" /> Danger Zone
                </h3>
                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
                  <p className="text-sm text-zinc-400">Actions in this area are irreversible and affect all tenants.</p>
                  <button className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all">Flush System Cache</button>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab !== "stats" && activeTab !== "settings" && filteredData.length === 0 && (
            <div className="py-20 text-center">
              <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white">No data found</h3>
              <p className="text-zinc-500">Refine your search or add a new entry</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals (Company, User, Password Reset) remain the same but ensure they have better responsive padding */}
      {/* (Skipping detailed modal code as it's already implemented correctly in the previous step) */}
      
      {/* [MODAL CODE FROM PREVIOUS STEP GOES HERE] */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCompanyModalOpen(false)}></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-10">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-500" /> New Company
              </h2>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Company Name</label>
                  <input required className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Email</label>
                    <input type="email" className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Phone</label>
                    <input className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Address</label>
                  <textarea rows={2} className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" value={companyForm.address} onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => setIsCompanyModalOpen(false)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold order-2 sm:order-1">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold order-1 sm:order-2">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-6 sm:p-10">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-500" /> New User
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Full Name</label>
                  <input required className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Email</label>
                  <input required type="email" className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Password</label>
                  <input required type="password" className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Company</label>
                    <select required className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" value={userForm.companyId} onChange={(e) => setUserForm({...userForm, companyId: e.target.value})}>
                      <option value="">Select Company</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Role</label>
                    <select required className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" value={userForm.roleId} onChange={(e) => setUserForm({...userForm, roleId: e.target.value})}>
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold order-2 sm:order-1">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold order-1 sm:order-2">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                <Key className="w-6 h-6 text-indigo-500" /> Reset Password
              </h2>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input required type="password" className="w-full bg-zinc-950 border-zinc-800 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 bg-zinc-800 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold">Reset</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
