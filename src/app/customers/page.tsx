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
  const [extraPhones, setExtraPhones] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/customers");
    if (response.ok) {
      const rows: CustomerRow[] = await response.json();
      setCustomers(rows);
      setSelected((current) =>
        current.length > 0
          ? current.filter((id) => rows.some((row) => row.id === id))
          : rows.filter((row) => row.marketingOptIn && row.phone).map((row) => row.id)
      );
    }
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
      body: JSON.stringify({
        mode: "bulk",
        message,
        customerIds: selected,
        phones: extraPhones,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setNotice(result.error || "The message was not sent");
      return;
    }
    const skipped = result.skipped?.length ? ` Skipped ${result.skipped.length} invalid number${result.skipped.length === 1 ? "" : "s"}.` : "";
    setNotice(
      `Bulk SMS: sent to ${result.sent} of ${result.total}.${result.failed ? ` ${result.failed} failed. ${result.detail || ""}` : ""}${skipped}`
    );
    setExtraPhones("");
    load();
  };

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const reachable = customers.filter((customer) => customer.marketingOptIn && customer.phone).length;
  const extraCount = extraPhones.split(/[\s,;]+/).filter((value) => value.trim()).length;

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-slate-100">
        <div className="bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold">Bulk SMS</h1>
            <p className="text-slate-300 text-sm mt-1">
              Pick saved numbers, paste more, and send one message for new arrivals or a promotion.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <section className="bg-white rounded-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-950">Saved numbers</h2>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() => setSelected(customers.filter((row) => row.phone).map((row) => row.id))}
                >
                  All
                </button>
                <button
                  className="btn btn-secondary text-xs"
                  onClick={() =>
                    setSelected(customers.filter((row) => row.marketingOptIn && row.phone).map((row) => row.id))
                  }
                >
                  Offers
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {customers.length === 0 && (
                <p className="p-6 text-sm text-slate-500">No customer numbers yet. Ask for a phone when you take payment, or paste numbers into the bulk SMS box.</p>
              )}
              {customers.map((customer) => (
                <label key={customer.id} className="p-4 flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(customer.id)}
                      onChange={() => toggle(customer.id)}
                    />
                    <span>
                      <span className="block font-semibold text-slate-950">{customer.name}</span>
                      <span className="block text-sm text-slate-600">{customer.phone}</span>
                    </span>
                  </span>
                  <span className="text-right text-xs text-slate-500">
                    <span className="block">{customer.marketingOptIn ? "Offers on" : "Receipts only"}</span>
                    <span className="block">{customer.lastSale?.receiptNumber || "No sale yet"}</span>
                  </span>
                </label>
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

            <section id="bulk-sms" className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h2 className="font-semibold text-slate-950">Bulk SMS</h2>
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Swiftpos is on hold at Intek, so these texts go out under the sender name Primecare until Swiftpos is released. Put the shop name in the message.
              </p>
              <p className="text-xs text-slate-500">{selected.length} selected · {reachable} opted in for offers</p>
              <div className="flex gap-2">
                {presets.map((preset) => (
                  <button key={preset} className="btn btn-secondary text-xs" onClick={() => setMessage(preset)}>
                    {preset.startsWith("New") ? "New arrivals" : "Promotion"}
                  </button>
                ))}
              </div>
              <textarea className="input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} />
              <p className="text-xs text-slate-500">{message.length} characters</p>
              <textarea
                className="input min-h-20"
                placeholder="Paste extra numbers, one per line"
                value={extraPhones}
                onChange={(e) => setExtraPhones(e.target.value)}
              />
              <button className="btn btn-primary w-full" disabled={busy || (selected.length === 0 && extraCount === 0)} onClick={send}>
                <Send className="w-4 h-4 mr-2" />
                Send bulk SMS
              </button>
            </section>
            {notice && <p className="text-sm font-medium text-slate-700">{notice}</p>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
