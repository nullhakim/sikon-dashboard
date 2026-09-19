/**
 * Extended product types matching the new SIKOn backend API structure.
 * These interfaces align 100% with the POST/PUT /api/v1/products payload.
 */

// ---------------------------------------------------------------------------
// Fabric & Color
// ---------------------------------------------------------------------------

import type { Material } from "./material";

export interface ProductFabric {
  id?: string;
  /** UUID Material (category=kain) — wajib diisi */
  material_id: string;
  /** Di-preload backend saat GET — sumber nama/komposisi/warna/harga cost */
  material?: Material;
  /** Konsumsi meter kain per pcs */
  qty_per_unit: number;
  /** Markup ke harga jual customer kalau pilih kain ini (BEDA dari material.unit_price) */
  price_adjustment: number;
  is_default: boolean;
}

// ---------------------------------------------------------------------------
// Wholesale Tiering
// ---------------------------------------------------------------------------

export interface WholesaleTier {
  id?: string;
  fabric_id?: string; // optional — specific to a fabric variant
  min_qty: number; // e.g. 6
  max_qty?: number; // e.g. 23 (undefined = no upper limit)
  unit_price: number; // e.g. 175000
}

// ---------------------------------------------------------------------------
// Canvas Designer Template
// ---------------------------------------------------------------------------

export interface DesignModelView {
  side: "front" | "back";
  art_url: string; // Lineart PNG — uploaded to mockups folder
  mask_url: string; // Silhouette Mask PNG — uploaded to mockups folder
  width?: number; // default 1756
  height?: number; // default 1920
}

export interface DesignModel {
  id?: string;
  name: string; // e.g. "Series 1 — Lengan Panjang"
  type: string; // "long_sleeve" | "short_sleeve"
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
  gsm_info?: string; // e.g. "210gsm"
  fabric_summary?: string; // e.g. "Ripstop Cotton"
  key_features?: string[]; // e.g. ["Bahan anti robek", "Dual chest pocket"]
  image_urls?: string[];
  fabrics?: ProductFabric[];
  wholesale?: WholesaleTier[];
  design_model?: DesignModel;
}
