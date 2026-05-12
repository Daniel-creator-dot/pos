import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  categoryName: string | null;
  updatedAt: number;
}

export interface LocalSetting {
  key: string;
  value: string;
}

export interface PendingSale {
  id?: number;
  receiptNumber: string;
  data: {
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[];
    discount: number;
    payments: {
      method: string;
      amount: number;
      reference?: string;
    }[];
    storeId?: string | null;
    userId?: string | null;
    createdAt: string;
  };
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

export class POSDatabase extends Dexie {
  products!: Table<LocalProduct>;
  settings!: Table<LocalSetting>;
  salesQueue!: Table<PendingSale>;

  constructor() {
    super('POSDatabase');
    this.version(1).stores({
      products: 'id, barcode, name',
      settings: 'key',
      salesQueue: '++id, status, receiptNumber'
    });
  }
}

export const db = new POSDatabase();
