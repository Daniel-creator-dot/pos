const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "GH₵",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  KRW: "₩",
  BRL: "R$",
  CAD: "C$",
  AUD: "A$",
  CHF: "Fr",
  SEK: "kr",
  NZD: "NZ$",
  MXN: "$",
  SGD: "S$",
  HKD: "HK$",
  NOK: "kr",
  TRY: "₺",
  RUB: "₽",
  ZAR: "R",
  NGN: "₦",
  KES: "KSh",
  EGP: "E£",
  AED: "د.إ",
  SAR: "﷼",
};

export function getCurrencySymbol(currencyCode: string): string {
  return currencySymbols[currencyCode.toUpperCase()] || currencyCode;
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formatted = Math.abs(amount).toFixed(2);
  
  if (amount < 0) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

export function formatCurrencyPlain(amount: number, currencyCode: string = "USD"): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Math.abs(amount).toFixed(2)}`;
}