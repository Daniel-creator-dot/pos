"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  X,
  Check,
  Barcode,
} from "lucide-react";
import { format } from "date-fns";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { formatCurrency } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  category: { name: string } | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Payment {
  method: "CASH" | "CARD" | "MOBILE_MONEY";
  amount: number;
  reference?: string;
}

export default function POSPage() {
  const { data: session } = useSession();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currency, setCurrency] = useState("USD");

  // Fetch settings and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, productsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/products"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setCurrency(data.currency || "USD");
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data);
          setFilteredProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Focus barcode input on mount and after certain actions
  useEffect(() => {
    if (!isPaymentModalOpen && !showReceipt) {
      barcodeInputRef.current?.focus();
    }
  }, [isPaymentModalOpen, showReceipt]);

  // Search products
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  // Handle barcode input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeValue.trim()) {
      const product = products.find(
        (p) => p.barcode === barcodeValue.trim()
      );
      if (product) {
        addToCart(product);
        setBarcodeValue("");
      } else {
        setBarcodeValue("");
      }
    }
  };

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stockQty) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  // Complete sale
  const completeSale = async () => {
    if (cart.length === 0) return;

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total) {
      alert("Insufficient payment amount");
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
          discount,
          payments,
          storeId: session?.user?.storeId,
          userId: session?.user?.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastSale(result);
        setShowReceipt(true);
        setIsPaymentModalOpen(false);
        // Reset
        setCart([]);
        setPayments([]);
        setDiscount(0);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to complete sale");
      }
    } catch (error) {
      console.error("Sale error:", error);
      alert("Failed to complete sale");
    } finally {
      setProcessing(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading POS...</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Sale Completed!
                </h2>
                <p className="text-gray-500 mt-1">
                  Receipt: {lastSale.receiptNumber}
                </p>
              </div>

              <div className="receipt-print bg-gray-50 p-4 rounded-lg mb-6 font-mono text-sm">
                <div className="text-center mb-4">
                  <p className="font-bold">SwiftPOS</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(lastSale.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <div className="border-t border-b border-gray-300 py-2 mb-2">
                  {lastSale.saleItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-1">
                      <span>
                        {item.product.name} x{item.qty}
                      </span>
                      <span>{formatCurrency(item.subtotal, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(lastSale.subtotal, currency)}</span>
                  </div>
                  {lastSale.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount ({lastSale.discount}%):</span>
                      <span>-{formatCurrency(lastSale.discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(lastSale.total, currency)}</span>
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-2">
                    {lastSale.payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between">
                        <span>
                          {payment.method === "MOBILE_MONEY" 
                            ? `Mobile Money (${payment.reference || ""})` 
                            : payment.method}:
                        </span>
                        <span>{formatCurrency(payment.amount, currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold mt-1">
                      <span>Change:</span>
                      <span>
                        {formatCurrency(
                          lastSale.payments.reduce(
                            (s: number, p: any) => s + p.amount,
                            0
                          ) - lastSale.total,
                          currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={printReceipt}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setLastSale(null);
                    barcodeInputRef.current?.focus();
                  }}
                  className="btn btn-primary flex-1"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(total, currency)}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-gray-700">Payment Method</h3>
                {[
                  { id: "CASH", label: "Cash", icon: Banknote },
                  { id: "CARD", label: "Card", icon: CreditCard },
                  { id: "MOBILE_MONEY", label: "Mobile Money", icon: Smartphone },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={async () => {
                      if (method.id === "MOBILE_MONEY") {
                        // For Mobile Money, ask for phone number and amount
                        const phoneNumber = prompt("Enter Mobile Money phone number:") || "";
                        if (!phoneNumber) return;
                        const amount = parseFloat(
                          prompt(`Enter ${method.label} amount:`) || "0"
                        );
                        if (amount > 0) {
                          setPayments((prev) => [
                            ...prev,
                            {
                              method: method.id as Payment["method"],
                              amount,
                              reference: phoneNumber,
                            },
                          ]);
                        }
                      } else {
                        const amount = parseFloat(
                          prompt(`Enter ${method.label} amount:`) || "0"
                        );
                        if (amount > 0) {
                          setPayments((prev) => [
                            ...prev,
                            {
                              method: method.id as Payment["method"],
                              amount,
                            },
                          ]);
                        }
                      }
                    }}
                    className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    <method.icon className="w-6 h-6 text-gray-600" />
                    <span className="font-medium">{method.label}</span>
                  </button>
                ))}
              </div>

              {payments.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Payments</h3>
                  {payments.map((payment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100"
                    >
                      <span className="text-sm text-gray-600">
                        {payment.method}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCurrency(payment.amount, currency)}
                        </span>
                        <button
                          onClick={() =>
                            setPayments((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2 mt-2 font-bold">
                    <span>Total Paid:</span>
                    <span
                      className={
                        payments.reduce((s, p) => s + p.amount, 0) >= total
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(payments.reduce((s, p) => s + p.amount, 0), currency)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={completeSale}
                disabled={
                  processing ||
                  payments.reduce((s, p) => s + p.amount, 0) < total
                }
                className="btn btn-primary w-full h-12 text-lg"
              >
                {processing ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main POS Layout */}
      <div className="flex h-screen">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col">
          {/* Search & Barcode */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1">
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    placeholder="Scan barcode..."
                    className="input pl-10"
                    autoFocus
                  />
                </div>
              </form>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="input pl-10"
                />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-4">
            <div className="pos-grid">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`product-card ${
                    product.stockQty <= 0 ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="font-medium text-gray-900 truncate">
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {product.category?.name}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary-600">
                      {formatCurrency(product.price, currency)}
                    </span>
                    <span
                      className={`text-xs ${
                        product.stockQty <= product.lowStockThreshold
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      Stock: {product.stockQty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Cart</h2>
              <span className="ml-auto bg-primary-100 text-primary-700 text-xs font-medium px-2 py-1 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Scan or search products to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="cart-item bg-gray-50 rounded-lg px-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.product.price, currency)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300"
                        disabled={item.quantity >= item.product.stockQty}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200 ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Actions */}
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="input w-20 text-center"
              />
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="btn btn-primary w-full h-12 text-lg font-medium"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Process Payment
            </button>
          </div>
        </div>
    </div>
    </div>
    </AuthenticatedLayout>
  );
}