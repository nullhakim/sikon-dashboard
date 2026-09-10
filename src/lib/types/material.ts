// Material Master, BOM, and HPP types — internal costing domain

export interface Material {
  id: string;
  name: string;
  /** e.g. "meter" | "pcs" | "roll" | "kg" — free text */
  unit: string;
  unit_price: number;
  /** e.g. "kain" | "aksesoris" | "packaging" — free text */
  category: string;
  created_at: string;
}

export interface ProductMaterial {
  id: string;
  material_id: string;
  qty_per_unit: number;
  /** Pre-loaded by BE in GET response */
  material?: Material;
}

/**
 * Response from GET /orders/:id/hpp
 * Requires role "accounting". Guard is handled globally by api.ts interceptor.
 */
export interface OrderHPPResponse {
  order_id: string;
  /** Frozen snapshot — locked when Order transitions from Quotation → Pending */
  material_cost: number;
  material_calculated_at: string | null;
  /** Live, recalculated from Work Logs on every call */
  labor_cost: number;
  total_cost: number;
}
