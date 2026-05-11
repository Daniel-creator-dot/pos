"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Plus, Building2, Users, ShoppingBag, 
  Store, Globe, Mail, Phone, MapPin, 
  ChevronRight, Search, LayoutDashboard,
  LogOut, Settings, ShieldCheck
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

export default function CompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Company Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    if (status === "unauthenticated" || (session && session.user.role.name !== "superadmin")) {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchCompanies();
    }
  }, [status, session, router]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", email: "", phone: "", address: "" });
        fetchCompanies();
      }
    } catch (err) {
      console.error("Error creating company:", err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Sidebar - Minimal Glassmorphism */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 z-50 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              SWIFTPOS
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl font-bold transition-all border border-indigo-500/20">
            <Building2 className="w-5 h-5" /> Companies
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 rounded-xl font-medium transition-all group">
            <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200 rounded-xl font-medium transition-all group">
            <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 rounded-xl font-medium transition-all group">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 min-h-screen">
        <header className="h-20 px-10 flex items-center justify-between border-b border-zinc-800 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-40">
          <div>
            <h1 className="text-2xl font-bold text-white">Company Management</h1>
            <p className="text-sm text-zinc-500">Manage all business tenants on the platform</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search companies..." 
                className="bg-zinc-900 border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Company
            </button>
          </div>
        </header>

        <div className="p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl hover:border-indigo-500/50 transition-all group cursor-pointer">
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
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Mail className="w-3.5 h-3.5" /> {company.email || 'No email provided'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Phone className="w-3.5 h-3.5" /> {company.phone || 'No phone provided'}
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

            {filteredCompanies.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-700">
                  <Building2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white">No companies found</h3>
                <p className="text-zinc-500 mt-2">Try searching for something else or create a new company</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <h2 className="text-3xl font-black text-white mb-2">New Company</h2>
              <p className="text-zinc-500 mb-8">Initialize a new business entity on SwiftPOS</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1">Company Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Mega Retail Group" 
                      className="w-full bg-zinc-950 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1">Business Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="email" 
                        placeholder="contact@business.com" 
                        className="w-full bg-zinc-950 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1">Contact Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="tel" 
                        placeholder="+1 234 567 890" 
                        className="w-full bg-zinc-950 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 pl-1">Headquarters Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-4 top-4 text-zinc-500" />
                    <textarea 
                      rows={3}
                      placeholder="Full business address..." 
                      className="w-full bg-zinc-950 border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-bold transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    Create Company
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
