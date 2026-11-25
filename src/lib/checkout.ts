export interface CheckoutTotals {
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  tax: number;
  total: number;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function checkoutTotals(
  subtotal: number,
  discountPercent: number,
  taxRate: number
): CheckoutTotals {
  const safeDiscount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const discountAmount = roundMoney(subtotal * (safeDiscount / 100));
  const taxable = roundMoney(subtotal - discountAmount);
  const tax = roundMoney(taxable * (safeTaxRate / 100));
  const total = roundMoney(taxable + tax);

  return {
    discountPercent: safeDiscount,
    discountAmount,
    taxRate: safeTaxRate,
    tax,
    total,
  };
}

export interface StockAdjustmentResult {
  movementQty: number;
  nextQty: number;
}

export function stockAdjustment(
  currentQty: number,
  type: string,
  qty: number
): StockAdjustmentResult | { error: string } {
  if (!Number.isInteger(qty) || qty < 0) {
    return { error: "Quantity must be a whole number of 0 or more" };
  }

  if (type === "IN" || type === "OUT") {
    if (qty <= 0) {
      return { error: "Quantity must be greater than 0" };
    }
  }

  if (type === "IN") {
    return { movementQty: qty, nextQty: currentQty + qty };
  }

  if (type === "OUT") {
    if (currentQty < qty) {
      return { error: "Insufficient stock for this adjustment" };
    }
    return { movementQty: qty, nextQty: currentQty - qty };
  }

  if (type === "ADJUSTMENT") {
    const delta = qty - currentQty;
    if (delta === 0) {
      return { error: "Stock is already at that quantity" };
    }
    return { movementQty: Math.abs(delta), nextQty: qty };
  }

  return { error: "Type must be IN, OUT, or ADJUSTMENT" };
}
