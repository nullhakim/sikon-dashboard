// ─── Production Report Types (matches /api/reports/production response) ───────

/** Active Batch PO item. */
export interface ActiveBatchPO {
  id: string;
  name: string;
  status: string;
  quota: number;
}

/** Product summary row per category. */
export interface ProductSummaryRow {
  category_name: string;
  total_qty: number;
}

/** Sales summary row for production. */
export interface ProductionSalesRow {
  sales_name: string;
  total_qty: number;
  total_revenue: number;
}

/** Main data body from /reports/production */
export interface ProductionReportData {
  total_quota: number;
  total_qty_ordered: number;
  remaining_quota: number;
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
  total_hpp: number;
  net_profit: number;
  active_batch_pos: ActiveBatchPO[];
  product_summary: ProductSummaryRow[];
  sales_summary: ProductionSalesRow[];
}

export interface ProductionReportResponse {
  code?: number;
  status?: string;
  message?: string;
  data: ProductionReportData;
}
