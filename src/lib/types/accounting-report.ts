// ─── Accounting Report Types (matches /api/reports/accounting response) ────────

/** Summary metrics for the selected date range. */
export interface AccountingSummary {
  total_omset: number;
  total_cash_in: number;
  total_receivable: number;
  total_order_count: number;
  total_item_qty: number;
}

/** Single day data point for the daily trend chart. */
export interface AccountingDailyTrend {
  date: string; // YYYY-MM-DD
  omset_amount: number;
  cash_in: number;
}

/** Per-sales performance row. */
export interface AccountingSalesPerformance {
  sales_name: string;
  total_omset: number;
  total_orders: number;
}

/** Main data body from /reports/accounting */
export interface AccountingReportData {
  summary: AccountingSummary;
  daily_trends: AccountingDailyTrend[];
  sales_performances: AccountingSalesPerformance[];
}

export interface AccountingReportResponse {
  code?: number;
  status?: string;
  message?: string;
  data: AccountingReportData;
}
