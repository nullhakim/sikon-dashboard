// Domain types derived from the SIKOn OpenAPI spec.

export type OrderStatus = "quotation" | "pending" | "production" | "completed" | "canceled";
export type PaymentType = "dp" | "settlement" | "installment";

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
  account_name: string;
  user_id?: string | null;
  is_global?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  sales_id?: string;
  sales?: User;
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
  product?: Product;
  product_name?: string;
  qty: number;
  price: number;
  subtotal?: number;
  details?: Record<string, any>;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_type: PaymentType | string;
  bank_account_id?: string;
  bank_account?: BankAccount;
  reference_number?: string;
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
  order?: Order;
}

export interface Order {
  id: string;
  order_number?: string;
  customer_id: string;
  customer?: Customer;
  sales_id?: string;
  sales?: User;
  order_status: OrderStatus | string;
  payment_status?: string;
  total_amount: number;
  shipping_cost?: number;
  courier_name?: string;
  shipping_address?: string;
  notes?: string;
  valid_until?: string;
  terms_conditions?: string;
  items?: OrderItem[];
  payments?: Payment[];
  created_at?: string;
  updated_at?: string;
}
