import type { Order, Payment } from "../types";

export interface DashboardOverviewSummary {
  total_revenue?: number;
  total_payment_received?: number;
  total_omset?: number;
  total_receivable?: number;
  total_active_orders?: number;
  active_orders_count?: number;
}

export interface DashboardOverviewActiveBatchPO {
  id?: string;
  name?: string;
  status?: string;
  quota?: number;
  total_qty_ordered?: number;
  remaining_quota?: number;
  used_quota?: number;
  current_qty?: number;
  filled_quota?: number;
  orders_count?: number;
  start_date?: string;
  end_date?: string;
}

export interface DashboardOverviewActionRequired {
  unverified_payments_count?: number;
  ready_orders_count?: number;
  pending_orders_count?: number;
}

export interface DashboardOverviewChartTrend {
  date: string;
  total_revenue?: number;
  total_orders?: number;
  completed_orders?: number;
  canceled_orders?: number;
  omset_amount?: number;
  cash_in?: number;
}

export interface DashboardOverviewDailyTrend {
  date: string;
  omset_amount?: number;
  cash_in?: number;
  total_revenue?: number;
  total_orders?: number;
}

export interface DashboardOverviewData {
  summary?: DashboardOverviewSummary;
  active_batch_po?: DashboardOverviewActiveBatchPO | null;
  action_required?: DashboardOverviewActionRequired;
  recent_orders?: Order[];
  recent_payments?: Payment[];
  chart_trends?: DashboardOverviewChartTrend[];
  daily_trends?: DashboardOverviewDailyTrend[];
}
