"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  lowStockThreshold: number;
  // SMS Configuration
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsApiSecret: string;
  smsSenderId: string;
  smsEndpoint: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<StoreSettings>({
    name: "SwiftPOS Store",
    address: "",
    phone: "",
    email: "",
    taxRate: 0,
    currency: "USD",
    lowStockThreshold: 5,
    smsEnabled: false,
    smsProvider: "generic",
    smsApiKey: "",
    smsApiSecret: "",
    smsSenderId: "",
    smsEndpoint: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAdmin = session?.user?.role?.name === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Failed to save settings" });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Access Denied</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system settings</p>
        </div>

        <div className="max-w-2xl">
          {message && (
            <div
              className={`mb-4 p-3 rounded-md ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-600"
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Store Information</h2>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label className="label block mb-1">Store Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label block mb-1">Store Address</label>
                  <textarea
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="label block mb-1">Store Phone</label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label block mb-1">Store Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Sales Settings</h2>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label className="label block mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label block mb-1">Default Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="input"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="GHS">GHS (₵)</option>
                  </select>
                </div>
                <div>
                  <label className="label block mb-1">Default Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.lowStockThreshold}
                    onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">SMS Configuration</h2>
              </div>
              <div className="card-content space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="smsEnabled"
                    checked={settings.smsEnabled}
                    onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <label htmlFor="smsEnabled" className="label">Enable SMS Notifications</label>
                </div>

                {settings.smsEnabled && (
                  <>
                    <div>
                      <label className="label block mb-1">SMS Provider</label>
                      <select
                        value={settings.smsProvider}
                        onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                        className="input"
                      >
                        <option value="generic">Generic HTTP</option>
                        <option value="twilio">Twilio</option>
                        <option value="africas_talking">Africa's Talking</option>
                      </select>
                    </div>

                    <div>
                      <label className="label block mb-1">Sender ID</label>
                      <input
                        type="text"
                        value={settings.smsSenderId}
                        onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value })}
                        className="input"
                        placeholder="Your store name or phone number"
                      />
                    </div>

                    {settings.smsProvider === "generic" && (
                      <div>
                        <label className="label block mb-1">SMS Endpoint URL</label>
                        <input
                          type="url"
                          value={settings.smsEndpoint}
                          onChange={(e) => setSettings({ ...settings, smsEndpoint: e.target.value })}
                          className="input"
                          placeholder="https://api.sms-provider.com/send"
                        />
                      </div>
                    )}

                    <div>
                      <label className="label block mb-1">API Key</label>
                      <input
                        type="password"
                        value={settings.smsApiKey}
                        onChange={(e) => setSettings({ ...settings, smsApiKey: e.target.value })}
                        className="input"
                        placeholder="Your API key"
                      />
                    </div>

                    {settings.smsProvider === "twilio" && (
                      <div>
                        <label className="label block mb-1">API Secret (Account SID)</label>
                        <input
                          type="password"
                          value={settings.smsApiSecret}
                          onChange={(e) => setSettings({ ...settings, smsApiSecret: e.target.value })}
                          className="input"
                          placeholder="Your Twilio Account SID"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </AuthenticatedLayout>
  );
}