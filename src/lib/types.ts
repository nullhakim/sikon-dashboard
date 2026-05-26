// Domain types derived from the SIKOn OpenAPI spec.

export type OrderStatus = "pending" | "production" | "completed" | "canceled";
export type PaymentType = "dp" | "full" | "settlement";

export interface Category {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  base_price: number;
  category_id?: string;
  category?: Category;
  description?: string;
  created_at?: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  user_id?: string | null;
  is_global?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  price: number;
  subtotal?: number;
  notes?: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_type: PaymentType | string;
  bank_account_id?: string;
  bank_account?: BankAccount;
  note?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  invoice_number?: string;
  customer_id: string;
  customer?: Customer;
  user_id?: string;
  user?: User;
  status: OrderStatus | string;
  total: number;
  paid?: number;
  remaining?: number;
  shipping_cost?: number;
  courier?: string;
  address?: string;
  note?: string;
  items?: OrderItem[];
  payments?: Payment[];
  created_at?: string;
  updated_at?: string;
}
