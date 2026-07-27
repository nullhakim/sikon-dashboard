// ─── Monthly Report Types (matches /api/reports/monthly response) ─────────────

/** Summary metrics for the selected month. */
export interface MonthlySummary {
  total_omset: number;
  total_cash_in: number;
  total_receivable: number;
  total_order_count: number;
  total_item_qty: number;
}

/** Single day data point for the daily trend chart. */
export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  omset_amount: number;
  cash_in: number;
}

/** Per-sales performance row. */
export interface SalesPerformanceRow {
  sales_id: string;
  sales_name: string;
  total_omset: number;
  total_orders: number;
}

/** Main data body from /reports/monthly */
export interface MonthlyReportData {
  month: number;
  year: number;
  period_name: string;
  summary: MonthlySummary;
  daily_trends: DailyTrendPoint[];
  sales_performances: SalesPerformanceRow[];
}

export interface MonthlyReportResponse {
  code: number;
  status: string;
  message: string;
  data: MonthlyReportData;
}
