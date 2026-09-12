/**
 * Extended product types matching the new SIKOn backend API structure.
 * These interfaces align 100% with the POST/PUT /api/v1/products payload.
 */

// ---------------------------------------------------------------------------
// Fabric & Color
// ---------------------------------------------------------------------------

export interface FabricColor {
  id?: string;      // present in GET responses
  name: string;     // e.g. "Olive"
  hex_code: string; // e.g. "#4b5320"
}

export interface ProductFabric {
  id?: string;
  /** UUID dari Master Kain (/api/materials) — wajib diisi untuk HPP */
  fabric_id?: string | null;
  /** Konsumsi meter kain per pcs — wajib jika fabric_id diisi */
  qty_per_unit?: number;
  spec_template_id?: string | null; // legacy — referensi ke Spec Template lama (nullable)
  name: string;              // e.g. "Ripstop Cotton 65/35" — auto-filled dari master kain
  description?: string;
  composition?: string;      // e.g. "65% Cotton / 35% Polyester" — auto-filled
  care_instruction?: string; // auto-filled dari master kain
  base_price?: number;
  price_adjustment?: number;
  is_default?: boolean;
  colors?: FabricColor[];    // auto-filled dari master kain
}

// ---------------------------------------------------------------------------
// Wholesale Tiering
// ---------------------------------------------------------------------------

export interface WholesaleTier {
  id?: string;
  fabric_id?: string; // optional — specific to a fabric variant
  min_qty: number;    // e.g. 6
  max_qty?: number;   // e.g. 23 (undefined = no upper limit)
  unit_price: number; // e.g. 175000
}

// ---------------------------------------------------------------------------
// Canvas Designer Template
// ---------------------------------------------------------------------------

export interface DesignModelView {
  side: "front" | "back";
  art_url: string;     // Lineart PNG — uploaded to mockups folder
  mask_url: string;    // Silhouette Mask PNG — uploaded to mockups folder
  width?: number;      // default 1756
  height?: number;     // default 1920
}

export interface DesignModel {
  id?: string;
  name: string;         // e.g. "Series 1 — Lengan Panjang"
  type: string;         // "long_sleeve" | "short_sleeve"
  description?: string;
  views?: DesignModelView[];
}

// ---------------------------------------------------------------------------
// Product Payload (for POST / PUT)
// ---------------------------------------------------------------------------

export interface ProductPayload {
  name: string;
  slug?: string;
  category_id: string;
  base_price: number;
  description?: string;
  gsm_info?: string;          // e.g. "210gsm"
  fabric_summary?: string;    // e.g. "Ripstop Cotton"
  key_features?: string[];    // e.g. ["Bahan anti robek", "Dual chest pocket"]
  image_urls?: string[];
  fabrics?: ProductFabric[];
  wholesale?: WholesaleTier[];
  design_model?: DesignModel;
}
