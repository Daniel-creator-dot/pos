"use client";

import { useEffect, useState } from "react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Send } from "lucide-react";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
  lastSale: { receiptNumber: string | null; total: number; createdAt: string } | null;
}

const presets = [
  "New arrivals are in the shop today. Come and see them.",
  "A promotion is on this week. Ask in the shop for the offer.",
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(presets[0]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/customers");
    if (response.ok) setCustomers(await response.json());
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, marketingOptIn: true }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setNotice(result.error || "Could not save that number");
      return;
    }
    setName("");
    setPhone("");
    setNotice("Number saved for receipts and offers.");
    load();
  };

  const send = async () => {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "broadcast", message }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setNotice(result.error || "The message was not sent");
      return;
    }
    setNotice(
      `Sent to ${result.sent} of ${result.total} numbers.${result.failed ? ` ${result.failed} failed. ${result.detail || ""}` : ""}`
    );
  };

  const reachable = customers.filter((customer) => customer.marketingOptIn && customer.phone).length;

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-slate-100">
        <div className="bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-slate-300 text-sm mt-1">
              Numbers taken at the till. Use them for the receipt, new arrivals, and promotions.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <section className="bg-white rounded-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-950">Saved numbers</h2>
              <span className="text-sm text-slate-500">{reachable} can get offers</span>
            </div>
            <div className="divide-y divide-slate-100">
              {customers.length === 0 && (
                <p className="p-6 text-sm text-slate-500">No customer numbers yet. Ask for a phone when you take payment.</p>
              )}
              {customers.map((customer) => (
                <div key={customer.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{customer.name}</div>
                    <div className="text-sm text-slate-600">{customer.phone}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{customer.marketingOptIn ? "Offers on" : "Receipts only"}</div>
                    <div>{customer.lastSale?.receiptNumber || "No sale yet"}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold text-slate-950">Add a number</h2>
              <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <button className="btn btn-primary w-full" disabled={busy} onClick={add}>Save number</button>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold text-slate-950">New arrivals and promotions</h2>
              <div className="flex gap-2">
                {presets.map((preset) => (
                  <button key={preset} className="btn btn-secondary text-xs" onClick={() => setMessage(preset)}>
                    {preset.startsWith("New") ? "New arrivals" : "Promotion"}
                  </button>
                ))}
              </div>
              <textarea className="input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} />
              <button className="btn btn-primary w-full" disabled={busy || reachable === 0} onClick={send}>
                <Send className="w-4 h-4 mr-2" />
                Text {reachable} customers
              </button>
            </section>
            {notice && <p className="text-sm font-medium text-slate-700">{notice}</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
