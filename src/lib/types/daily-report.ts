// ─── Daily Report Types ──────────────────────────────────────────────────────

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

export interface DailyReportData {
  daily_snapshot: DailySnapshot;
  active_pos: ActivePO[];
  total_outstanding_receivables: number;
  active_po_receivables: number;
  past_due_receivables: PastDueReceivable[];
}

export interface DailyReportResponse {
  data: DailyReportData;
  message: string;
}
