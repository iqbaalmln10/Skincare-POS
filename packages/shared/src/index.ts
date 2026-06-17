// Tipe dasar — disinkronkan manual dengan schema DBML (kasir_skincare_v2.dbml)
// Setiap perubahan schema DB wajib diikuti update di sini.

export type UserRole = "admin" | "kasir";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface Product {
  id: number;
  categoryId: number | null;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStock: number;
  imagePath: string | null;
  isActive: boolean;
}

export type PaymentMethod = "cash" | "qris" | "transfer";
export type TransactionStatus = "completed" | "voided";

export interface TransactionItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number;
  subtotal: number;
}

export interface Transaction {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  items: TransactionItem[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  totalPoints: number;
  membershipTierId: number | null;
}

// Bentuk standar response API agar frontend tidak menebak-nebak struktur
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
