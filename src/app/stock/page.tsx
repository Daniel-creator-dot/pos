"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  ClipboardCheck,
  Database,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import Modal from "@/components/Modal";
import { ToastContainer, useToast } from "@/components/Toast";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  stockQty: number;
  shopQty?: number;
  warehouseQty?: number;
  shopId?: string | null;
  warehouseId?: string | null;
  lowStockThreshold: number;
  category: { name: string } | null;
}

interface StockMovement {
  id: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  qty: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  user: { name: string } | null;
  product: { name: string };
  store?: { name: string; kind: string } | null;
}

type EntryMode = "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
type Place = "shop" | "warehouse";

interface EntryState {
  mode: EntryMode;
  productId: string;
  place: Place;
  direction: "TO_SHOP" | "TO_WAREHOUSE";
  qty: string;
  reason: string;
}

const ACTIONS: {
  mode: EntryMode;
  label: string;
  hint: string;
  icon: typeof Plus;
  className: string;
}[] = [
  {
    mode: "IN",
    label: "Stock in",
    hint: "Add pieces",
    icon: Plus,
    className: "bg-green-50 text-green-800 border-green-200 hover:bg-green-100",
  },
  {
    mode: "OUT",
    label: "Stock out",
    hint: "Remove pieces",
    icon: Minus,
    className: "bg-red-50 text-red-800 border-red-200 hover:bg-red-100",
  },
  {
    mode: "ADJUSTMENT",
    label: "Count",
    hint: "Set what you counted",
    icon: ClipboardCheck,
    className: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  {
    mode: "TRANSFER",
    label: "Transfer",
    hint: "Shop and warehouse",
    icon: ArrowLeftRight,
    className: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
  },
];

export default function StockPage() {
  const { data: session } = useSession();
  const { toasts, success, error: showError, removeToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<EntryState | null>(null);
  const [formError, setFormError] = useState("");

  const canAdjust = ["admin", "superadmin", "manager", "storekeeper"].includes(
    session?.user?.role?.name || ""
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/stock"),
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (movementsRes.ok) setMovements(await movementsRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const shopQtyOf = (product: Product) =>
    typeof product.shopQty === "number" ? product.shopQty : product.stockQty;
  const warehouseQtyOf = (product: Product) => product.warehouseQty ?? 0;
  const qtyAt = (product: Product, place: Place) =>
    place === "shop" ? shopQtyOf(product) : warehouseQtyOf(product);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      [product.name, product.barcode, product.category?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [products, query]);

  const lowStockProducts = products.filter(
    (product) => shopQtyOf(product) <= product.lowStockThreshold
  );

  const selected = products.find((product) => product.id === entry?.productId) || null;

  const openEntry = (mode: EntryMode, product?: Product) => {
    const place: Place = mode === "IN" ? "warehouse" : "shop";
    const starting =
      mode === "ADJUSTMENT" && product ? String(qtyAt(product, place)) : "1";
    setFormError("");
    setEntry({
      mode,
      productId: product?.id || "",
      place,
      direction: "TO_SHOP",
      qty: starting,
      reason: "",
    });
  };

  const chooseProduct = (product: Product) => {
    if (!entry) return;
    const starting =
      entry.mode === "ADJUSTMENT" ? String(qtyAt(product, entry.place)) : entry.qty || "1";
    setFormError("");
    setEntry({ ...entry, productId: product.id, qty: starting });
  };

  const choosePlace = (place: Place) => {
    if (!entry) return;
    const starting =
      entry.mode === "ADJUSTMENT" && selected ? String(qtyAt(selected, place)) : entry.qty;
    setEntry({ ...entry, place, qty: starting });
  };

  const bumpQty = (delta: number) => {
    if (!entry) return;
    const current = Number(entry.qty) || 0;
    const next = Math.max(entry.mode === "ADJUSTMENT" ? 0 : 1, current + delta);
    setEntry({ ...entry, qty: String(next) });
  };

  const sourceQty = () => {
    if (!selected || !entry) return 0;
    if (entry.mode === "TRANSFER") {
      return entry.direction === "TO_SHOP" ? warehouseQtyOf(selected) : shopQtyOf(selected);
    }
    return qtyAt(selected, entry.place);
  };

  const submitEntry = async () => {
    if (!entry || !selected) {
      setFormError("Choose a product");
      return;
    }
    const qty = Number(entry.qty);
    if (!Number.isInteger(qty) || qty < 0) {
      setFormError("Enter a whole number");
      return;
    }
    if (entry.mode !== "ADJUSTMENT" && qty <= 0) {
      setFormError("Enter a quantity greater than 0");
      return;
    }
    if (entry.mode === "OUT" && qty > sourceQty()) {
      setFormError(`Only ${sourceQty()} available there`);
      return;
    }
    if (entry.mode === "TRANSFER" && qty > sourceQty()) {
      setFormError(`Only ${sourceQty()} available to move`);
      return;
    }
    if (entry.mode === "ADJUSTMENT" && qty === sourceQty()) {
      setFormError("That already matches the count");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const response =
        entry.mode === "TRANSFER"
          ? await fetch("/api/stock/transfer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: selected.id,
                qty,
                direction: entry.direction,
              }),
            })
          : await fetch("/api/stock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId: selected.id,
                type: entry.mode,
                qty,
                reason: entry.reason.trim() || null,
                storeId:
                  entry.place === "warehouse" ? selected.warehouseId : selected.shopId,
              }),
            });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(data.error || "Could not save that stock change");
        return;
      }

      const placeName = entry.place === "warehouse" ? "warehouse" : "shop";
      if (entry.mode === "IN") success("Stock in", `Added ${qty} to the ${placeName}`);
      else if (entry.mode === "OUT") success("Stock out", `Removed ${qty} from the ${placeName}`);
      else if (entry.mode === "ADJUSTMENT") success("Count saved", `${selected.name} is now ${qty} in the ${placeName}`);
      else success(
        "Transfer saved",
        entry.direction === "TO_SHOP"
          ? `Moved ${qty} from the warehouse to the shop`
          : `Moved ${qty} from the shop to the warehouse`
      );
      setEntry(null);
      await fetchData();
    } catch (error) {
      console.error("Stock entry failed:", error);
      showError("Stock", "Could not save that stock change");
    } finally {
      setSaving(false);
    }
  };

  const action = ACTIONS.find((item) => item.mode === entry?.mode);

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading stock...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-1">
            Receive into the warehouse, count it, move it to the shop, then sell it on the register.
          </p>
          <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            {["1. Purchase", "2. Warehouse", "3. Shop floor", "4. Register"].map((step) => (
              <li key={step} className="rounded-full bg-slate-100 text-slate-700 px-3 py-1">{step}</li>
            ))}
          </ol>
        </header>

        <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-950 text-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Shop floor</div>
              <div className="text-3xl font-bold mt-1">
                {products.reduce((sum, product) => sum + shopQtyOf(product), 0)}
              </div>
              <div className="text-sm text-slate-300">pieces ready to sell</div>
            </div>
            <div className="rounded-2xl bg-amber-400 text-slate-950 p-4">
              <div className="text-xs uppercase tracking-wide">Warehouse</div>
              <div className="text-3xl font-bold mt-1">
                {products.reduce((sum, product) => sum + warehouseQtyOf(product), 0)}
              </div>
              <div className="text-sm">pieces waiting to move</div>
            </div>
          </section>

          {canAdjust && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => openEntry(item.mode)}
                    className={`text-left rounded-2xl border p-4 min-h-[92px] transition-colors ${item.className}`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs mt-0.5 opacity-80">{item.hint}</div>
                  </button>
                );
              })}
            </section>
          )}

          {lowStockProducts.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">
                  {lowStockProducts.length} product{lowStockProducts.length === 1 ? "" : "s"} low on the shop floor
                </p>
                <p className="text-sm text-red-600">
                  Transfer from the warehouse, or record stock in.
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input pl-9 h-11 rounded-xl"
              placeholder="Search products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <section className="space-y-3">
            {filtered.length === 0 ? (
              <div className="card p-10 text-center text-gray-500">
                <Database className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                No products match that search.
              </div>
            ) : (
              filtered.map((product) => {
                const low = shopQtyOf(product) <= product.lowStockThreshold;
                return (
                  <article key={product.id} className="card p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-gray-900">{product.name}</h2>
                          {low && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {warehouseQtyOf(product) > 0 ? "Move from warehouse" : "Low on shop floor"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {product.category?.name || "No category"}
                          {product.barcode ? ` · ${product.barcode}` : ""}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <QtyPill label="Shop" qty={shopQtyOf(product)} low={low} />
                          <QtyPill label="Warehouse" qty={warehouseQtyOf(product)} />
                        </div>
                      </div>
                      {canAdjust && (
                        <div className="grid grid-cols-4 sm:grid-cols-2 gap-2 sm:w-44">
                          {ACTIONS.map((item) => (
                            <button
                              key={item.mode}
                              type="button"
                              onClick={() => openEntry(item.mode, product)}
                              className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50"
                            >
                              {item.label === "Transfer" ? "Move" : item.label.replace("Stock ", "")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Recent movements</h2>
            </div>
            <div className="card-content">
              {movements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  No stock movements yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {movements.slice(0, 12).map((movement) => (
                    <li key={movement.id} className="py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{movement.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {movementLabel(movement)}
                          {movement.reason ? ` · ${movement.reason}` : ""}
                          {movement.user?.name ? ` · ${movement.user.name}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={movement.type === "OUT" ? "text-red-600 font-semibold" : "text-green-700 font-semibold"}>
                          {movement.type === "OUT" ? "−" : movement.type === "IN" ? "+" : ""}
                          {movement.qty}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(movement.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        <Modal
          isOpen={entry !== null}
          onClose={() => !saving && setEntry(null)}
          title={action?.label || "Stock"}
          size="lg"
        >
          {entry && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {!selected ? (
                <ProductPicker
                  products={filtered}
                  query={query}
                  onQuery={setQuery}
                  onPick={chooseProduct}
                  shopQtyOf={shopQtyOf}
                  warehouseQtyOf={warehouseQtyOf}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEntry({ ...entry, productId: "" })}
                    className="text-sm font-medium text-primary-700"
                  >
                    {selected.name}
                    <span className="text-gray-400 font-normal"> · change</span>
                  </button>

                  {entry.mode === "TRANSFER" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Choice
                        active={entry.direction === "TO_SHOP"}
                        onClick={() => setEntry({ ...entry, direction: "TO_SHOP" })}
                        title="Warehouse to shop"
                        detail={`${warehouseQtyOf(selected)} in the warehouse`}
                      />
                      <Choice
                        active={entry.direction === "TO_WAREHOUSE"}
                        onClick={() => setEntry({ ...entry, direction: "TO_WAREHOUSE" })}
                        title="Shop to warehouse"
                        detail={`${shopQtyOf(selected)} on the shop floor`}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Choice
                        active={entry.place === "shop"}
                        onClick={() => choosePlace("shop")}
                        title="Shop"
                        detail={`${shopQtyOf(selected)} now`}
                      />
                      <Choice
                        active={entry.place === "warehouse"}
                        onClick={() => choosePlace("warehouse")}
                        title="Warehouse"
                        detail={`${warehouseQtyOf(selected)} now`}
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label">
                        {entry.mode === "ADJUSTMENT" ? "Counted quantity" : "Quantity"}
                      </label>
                      <span className="text-xs text-gray-500">
                        {entry.mode === "OUT" || entry.mode === "TRANSFER"
                          ? `${sourceQty()} available`
                          : `Now ${sourceQty()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn btn-secondary h-12 w-12 rounded-xl" onClick={() => bumpQty(-1)}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        className="input h-12 text-center text-lg font-semibold rounded-xl"
                        inputMode="numeric"
                        value={entry.qty}
                        onChange={(event) =>
                          setEntry({ ...entry, qty: event.target.value.replace(/[^\d]/g, "") })
                        }
                      />
                      <button type="button" className="btn btn-secondary h-12 w-12 rounded-xl" onClick={() => bumpQty(1)}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {entry.mode !== "ADJUSTMENT" && (
                      <div className="flex gap-2 mt-2">
                        {[1, 5, 10].map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setEntry({ ...entry, qty: String(amount) })}
                            className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {entry.mode !== "TRANSFER" && (
                    <div>
                      <label className="label block mb-2">Note</label>
                      <input
                        className="input h-11 rounded-xl"
                        placeholder="Delivery, damage, count..."
                        value={entry.reason}
                        onChange={(event) => setEntry({ ...entry, reason: event.target.value })}
                      />
                    </div>
                  )}

                  {formError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={saving}
                    onClick={submitEntry}
                    className="btn btn-primary w-full h-12 rounded-xl text-base"
                  >
                    {saving ? "Saving..." : confirmLabel(entry)}
                    {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
                  </button>
                </>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AuthenticatedLayout>
  );
}

function QtyPill({ label, qty, low = false }: { label: string; qty: number; low?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 min-w-[92px] ${low ? "bg-red-50" : "bg-gray-50"}`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-xl font-semibold ${low ? "text-red-700" : "text-gray-900"}`}>{qty}</div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 min-h-[72px] ${
        active
          ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-500">{detail}</div>
    </button>
  );
}

function ProductPicker({
  products,
  query,
  onQuery,
  onPick,
  shopQtyOf,
  warehouseQtyOf,
}: {
  products: Product[];
  query: string;
  onQuery: (value: string) => void;
  onPick: (product: Product) => void;
  shopQtyOf: (product: Product) => number;
  warehouseQtyOf: (product: Product) => number;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="input pl-9 h-11 rounded-xl"
          placeholder="Find a product"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        {products.length === 0 && (
          <p className="text-sm text-gray-500 py-6 text-center">No products to update.</p>
        )}
        {products.slice(0, 12).map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onPick(product)}
            className="w-full text-left rounded-xl border border-gray-200 px-3 py-3 hover:bg-gray-50"
          >
            <div className="font-medium text-gray-900">{product.name}</div>
            <div className="text-sm text-gray-500">
              Shop {shopQtyOf(product)} · Warehouse {warehouseQtyOf(product)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function confirmLabel(entry: EntryState) {
  if (entry.mode === "IN") return "Add stock";
  if (entry.mode === "OUT") return "Remove stock";
  if (entry.mode === "ADJUSTMENT") return "Save count";
  return entry.direction === "TO_SHOP" ? "Move to shop" : "Move to warehouse";
}

function movementLabel(movement: StockMovement) {
  const place = movement.store?.kind === "WAREHOUSE" ? "warehouse" : movement.store ? "shop" : "stock";
  if (movement.reference?.startsWith("transfer:")) {
    return movement.type === "OUT" ? `Moved out of the ${place}` : `Moved into the ${place}`;
  }
  if (movement.type === "IN") return `Stock in at the ${place}`;
  if (movement.type === "OUT") return `Stock out at the ${place}`;
  return `Count at the ${place}`;
}
