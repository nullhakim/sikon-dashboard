// ─── Daily Report Types (matches /api/reports/daily response) ─────────────────

/** Active PO info for the daily report. */
export interface DailyReportPOInfo {
  po_id: string;
  po_name: string;
  quota: number;
  remaining_quota: number;
}

/** Single data point in the order qty trend chart. */
export interface DailyReportTrendPoint {
  date: string; // YYYY-MM-DD
  qty: number;
}

/** Order quantity summary for the day. */
export interface DailyReportOrderSummary {
  qty_today: number;
  qty_total_po: number;
  trend_data: DailyReportTrendPoint[];
}

/** Financial summary for the day. */
export interface DailyReportFinancialSummary {
  total_revenue: number;
  total_paid: number;
  active_po_outstanding: number;
  previous_po_outstanding: number;
  total_outstanding: number;
}

/** Per-sales detail row with category breakdown. */
export interface DailyReportSalesDetail {
  sales_name: string;
  categories: Record<string, number>; // map<category_name, qty>
  total_qty: number;
}

/** Main data body from /reports/daily */
export interface DailyReportData {
  report_date: string; // YYYY-MM-DD
  po_info: DailyReportPOInfo;
  order_summary: DailyReportOrderSummary;
  financial_summary: DailyReportFinancialSummary;
  sales_details: DailyReportSalesDetail[];
}

export interface DailyReportResponse {
  code?: number;
  status?: string;
  message?: string;
  data: DailyReportData;
}
