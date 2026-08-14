// Domain types derived from the SIKOn OpenAPI spec.
export type { FabricColor, ProductFabric, WholesaleTier, DesignModelView, DesignModel, ProductPayload } from "./types/product";

/** A single material/part block inside an order item's `details` array. */
export interface DetailPart {
  part: string;          // e.g. "Kemeja (Atasan)", "Celana (Bawahan)"
  material_name: string; // e.g. "American Drill"
  spec: string;          // e.g. "Warna Navy Blue, Bordir Logo"
}

export type OrderStatus = "quotation" | "pending" | "production" | "ready" | "completed" | "canceled";
export type PaymentType = "dp" | "settlement" | "installment";

export interface Category {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface SpecTemplateColor {
  id: string;
  name: string;
  hex_code: string;
}

export interface SpecTemplate {
  id: string;
  name: string;
  spec: string;              // deskripsi singkat / short spec
  description?: string;      // deskripsi panjang
  composition?: string;      // e.g. "65% Polyester / 35% Viscose"
  care_instruction?: string; // e.g. "Setrika suhu sedang, jangan gunakan pemutih"
  colors?: SpecTemplateColor[]; // Pilihan warna yang tersedia untuk template ini
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  base_price: number;
  category_id?: string;
  category?: Category;
  description?: string;
  gsm_info?: string;          // e.g. "210gsm"
  fabric_summary?: string;    // e.g. "Ripstop Cotton"
  key_features?: string[];
  images?: ProductImage[];
  image_urls?: string[];      // Used for payload
  fabrics?: import('./types/product').ProductFabric[];
  wholesale?: import('./types/product').WholesaleTier[];
  design_model?: import('./types/product').DesignModel;
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
  image_url?: string;
  status_text?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  custom_name?: string;    // Optional override display name
  product?: Product;
  product_name?: string;
  qty: number;
  price: number;
  subtotal?: number;
  /** New shape: array of material/part blocks */
  details?: DetailPart[] | Record<string, any>;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_type: PaymentType | string;
  status?: "pending" | "verified" | "rejected" | string;
  bank_account_id?: string;
  bank_account?: BankAccount;
  reference_number?: string;
  payment_date?: string;
  created_at?: string;
  updated_at?: string;
  order?: Order;
}

export interface BatchPO {
  id: string;
  name: string;
  target_month?: number;
  target_year?: number;
  start_date: string;
  end_date: string;
  quota: number;
  status: "draft" | "active" | "closed" | string;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  batch_po_id?: string;
  batch_po?: BatchPO;
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
  /** Tanggal order resmi disetujui/deal. Diisi otomatis oleh backend saat DP dibayar. */
  approved_at?: string | null;
  items?: OrderItem[];
  payments?: Payment[];
  created_at?: string;
  updated_at?: string;
}
