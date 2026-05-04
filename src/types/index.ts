import { RoleName, PaymentMethod, StockMovementType, PurchaseStatus } from "@prisma/client";

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  storeId?: string;
  role?: Role;
  store?: Store;
}

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
  permissions: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  settings?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  categoryId: string;
  price: number;
  cost: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface Purchase {
  id: string;
  supplierId: string;
  userId: string;
  total: number;
  status: PurchaseStatus;
  notes?: string;
  supplier?: Supplier;
  user?: User;
  purchaseItems?: PurchaseItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  qty: number;
  unitCost: number;
  product?: Product;
}

export interface Sale {
  id: string;
  userId: string;
  storeId: string;
  total: number;
  discount: number;
  subtotal: number;
  tax: number;
  receiptNumber?: string;
  user?: User;
  store?: Store;
  saleItems?: SaleItem[];
  payments?: Payment[];
  receipt?: Receipt;
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  product?: Product;
}

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  sale?: Sale;
  createdAt: Date;
}

export interface Receipt {
  id: string;
  saleId: string;
  receiptNumber: string;
  printedAt: Date;
  format: string;
  sale?: Sale;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  qty: number;
  reason?: string;
  userId: string;
  reference?: string;
  product?: Product;
  user?: User;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ProductForm {
  name: string;
  barcode?: string;
  categoryId: string;
  price: number;
  cost: number;
  stockQty?: number;
  lowStockThreshold?: number;
}

export interface CategoryForm {
  name: string;
  description?: string;
}

export interface SupplierForm {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UserForm {
  name: string;
  email: string;
  password: string;
  roleId: string;
  storeId?: string;
}

export interface SaleFormData {
  items: CartItem[];
  discount: number;
  tax?: number;
  payments: {
    method: PaymentMethod;
    amount: number;
    reference?: string;
  }[];
  storeId: string;
  userId: string;
}