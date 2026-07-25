// ─── Daily Report Types (matches actual /api/reports/daily/generate response) ─

/** Single data point for the production trend chart. */
export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  qty: number;
}

/** PO info block nested under `po_info` */
export interface POInfo {
  po_id: string;
  po_name: string;
  quota: number;
  remaining_quota: number;
}

/** Order summary block nested under `order_summary` */
export interface OrderSummary {
  qty_today: number;
  qty_total_po: number;
  /** Optional — may be absent if backend hasn't implemented yet */
  trend_data?: TrendDataPoint[];
}

/** Financial summary block nested under `financial_summary` */
export interface FinancialSummary {
  total_revenue: number;
  total_paid: number;
  active_po_outstanding: number;
  previous_po_outstanding: number;
  total_outstanding: number;
}

/** Per-sales performance with dynamic category breakdown. */
export interface SalesDetailItem {
  sales_name: string;
  /** Dynamic map: category name → qty. e.g. { "Kemeja": 120, "Celana": 80 } */
  categories: Record<string, number>;
  total_qty: number;
}

/** Main data body from /reports/daily/generate */
export interface DailyReportData {
  report_date?: string;
  po_info?: POInfo | null;
  order_summary?: OrderSummary | null;
  financial_summary?: FinancialSummary | null;
  sales_details?: SalesDetailItem[];
  /** Optional trend data — may be at top level or inside order_summary */
  trend_data?: TrendDataPoint[];
}

export interface DailyReportResponse {
  data: DailyReportData;
  message: string;
}

// ─── Legacy types (kept for backward compat with other components if any) ─────

export interface SalesPerformanceItem {
  sales_name: string;
  product_category: string;
  total_qty: number;
}

export interface DailySnapshot {
  total_revenue_today: number;
  total_qty_today: number;
  sales_performance_today: SalesPerformanceItem[];
}

export interface ActivePO {
  batch_po_name: string;
  batch_po_id: string;
  total_revenue_entered: number;
  total_qty_received: number;
  remaining_quota: number;
}

export interface PastDueReceivable {
  sales_name: string;
  product_category: string;
  customer_name: string;
  unpaid_balance: number;
}
