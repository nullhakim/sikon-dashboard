// ─── PO Summary Types (matches /api/reports/po/{po_id}/summary response) ─────

/** Customer receivable row within a PO. */
export interface POSummaryCustomerReceivable {
  customer_name: string;
  total_amount: number;
  total_paid: number;
  outstanding_amount: number;
}

/** Product category summary within a PO. */
export interface POSummaryProductRow {
  category_name: string;
  total_qty: number;
}

/** Sales summary within a PO. */
export interface POSummarySalesRow {
  sales_name: string;
  total_qty: number;
  total_revenue: number;
}

/** Main data body from /reports/po/{po_id}/summary */
export interface POSummaryData {
  // Financial
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
  total_hpp: number;
  net_profit: number;
  // Quota
  total_quota: number;
  total_qty_ordered: number;
  remaining_quota: number;
  // Breakdowns
  product_summary: POSummaryProductRow[];
  sales_summary: POSummarySalesRow[];
  // Customer-level receivables
  customer_receivables: POSummaryCustomerReceivable[];
}

export interface POSummaryResponse {
  code?: number;
  status?: string;
  message?: string;
  data: POSummaryData;
}
