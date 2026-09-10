import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  CreditCard,
  TrendingUp,
  ArrowRight,
  Package,
  Wallet,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  BarChart2,
  RotateCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useLanguage } from "@/lib/language-context";
import { dashboardService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SIKOn ERP" },
      { name: "description", content: "Overview of konveksi operations, orders, and payments." },
    ],
  }),
  component: Dashboard,
});


const statusVariant: Record<string, string> = {
  quotation: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  production: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  ready: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  canceled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

const paymentTypeVariant: Record<string, string> = {
  dp: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  settlement: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  installment: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const key = `order_status.${status?.toLowerCase()}` as any;
  const label = t(key, status ?? "—");
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function PaymentTypeBadge({ type }: { type: string }) {
  const { t } = useLanguage();
  const key = `payment_type.${type?.toLowerCase()}` as any;
  const label = t(key, type?.toUpperCase() ?? "—");
  const cls = paymentTypeVariant[type?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

/** Formats YYYY-MM-DD -> short date */
function shortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

const chartConfig = {
  total_revenue: {
    label: "Omset",
    color: "var(--color-chart-1)",
  },
  total_orders: {
    label: "Total Orders",
    color: "var(--color-chart-2)",
  },
};

function Dashboard() {
  const { t } = useLanguage();

  // Single aggregated API call to GET /api/dashboard/overview
  const overviewQuery = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => dashboardService.overview(),
  });

  const isLoading = overviewQuery.isLoading;
  const isError = overviewQuery.isError;
  const overview = overviewQuery.data?.data;

  // Extract aggregated response data
  const summary = overview?.summary;
  const activeBatchPO = overview?.active_batch_po;
  const actionRequired = overview?.action_required;
  const recentOrders = (overview?.recent_orders ?? []).slice(0, 6);
  const recentPayments = (overview?.recent_payments ?? []).slice(0, 6);
  
  // Extract chart trends (prefer new chart_trends, fallback to daily_trends)
  const chartTrendsRaw = overview?.chart_trends ?? overview?.daily_trends ?? [];
  const chartTrends = chartTrendsRaw.map((d: Record<string, any>) => ({
    ...d,
    label: shortDate(d.date),
    total_revenue: d.total_revenue ?? d.omset_amount ?? 0,
    total_orders: d.total_orders ?? d.cash_in ?? 0,
  }));

  // Active PO calculations
  const poUsed =
    activeBatchPO?.total_qty_ordered ??
    activeBatchPO?.used_quota ??
    activeBatchPO?.current_qty ??
    activeBatchPO?.filled_quota ??
    activeBatchPO?.orders_count ??
    0;
  const poQuota = activeBatchPO?.quota ?? 0;
  const poRemaining =
    activeBatchPO?.remaining_quota ?? Math.max(0, poQuota - poUsed);
  const poProgressPct =
    poQuota > 0 ? Math.min(100, Math.round((poUsed / poQuota) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/orders" search={{ page: 1, search: "", order_status: "", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}>
            {t("dashboard.manage_orders")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* ── Error State ── */}
      {isError && (
        <Card className="border-destructive/40 bg-destructive/5 text-destructive p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
            <div className="rounded-full p-3 bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Gagal Memuat Data Dashboard</h3>
              <p className="text-xs text-muted-foreground">
                {overviewQuery.error instanceof Error
                  ? overviewQuery.error.message
                  : "Terjadi kesalahan saat mengambil data dari server. Silakan coba lagi."}
              </p>
            </div>
            <Button
              onClick={() => overviewQuery.refetch()}
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/30 hover:bg-destructive/10 text-xs mt-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("action.try_again")}
            </Button>
          </div>
        </Card>
      )}

      {/* ── BARIS 1: Top Hero Metric Cards (4 Columns) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Active Orders & Revenue */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl p-2.5 shrink-0 bg-violet-100 dark:bg-violet-900/40">
                <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{t("dashboard.active_orders_revenue")}</p>
                    <p className="text-xl font-bold tabular-nums leading-tight text-violet-700 dark:text-violet-300">
                      {(summary?.total_active_orders ?? summary?.active_orders_count ?? 0).toLocaleString("id-ID")} orders
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Penerimaan: {formatIDR(summary?.total_payment_received ?? summary?.total_omset ?? 0)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Revenue */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl p-2.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/40">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{t("dashboard.total_revenue")}</p>
                    <p className="text-xl font-bold tabular-nums leading-tight text-emerald-700 dark:text-emerald-300">
                      {formatIDR(summary?.total_revenue ?? summary?.total_omset ?? summary?.total_payment_received ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total omset terkumpul</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Total Receivables */}
        <Link to="/receivables" className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
          <Card className="border-border/60 transition-shadow hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl p-2.5 shrink-0 bg-amber-100 dark:bg-amber-900/40">
                  <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {isLoading ? (
                    <div className="space-y-2 pt-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">{t("dashboard.total_receivables")}</p>
                      <p className="text-xl font-bold tabular-nums leading-tight text-amber-700 dark:text-amber-300">
                        {formatIDR(summary?.total_receivable ?? 0)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Sisa tagihan belum lunas</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 4. Active Batch PO Progress */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl p-2.5 shrink-0 bg-blue-100 dark:bg-blue-900/40">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : activeBatchPO ? (
                  <>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {activeBatchPO.name ?? "Batch PO"}
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 shrink-0 capitalize">
                        {activeBatchPO.status ?? "Active"}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {(poQuota).toLocaleString("id-ID")} Pcs Target
                    </p>
                    <div className="mt-2 space-y-1">
                      <Progress value={poProgressPct} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Terpesan: {poUsed.toLocaleString("id-ID")} Pcs</span>
                        <span>Sisa Quota: {poRemaining.toLocaleString("id-ID")} Pcs</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Active Batch PO</p>
                    <p className="text-sm font-semibold text-foreground">Tidak Ada PO Aktif</p>
                    <p className="text-xs text-muted-foreground mt-1">Belum ada Batch PO aktif saat ini</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARIS 2: Visual Chart & Butuh Tindakan Section ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual Chart (2 Columns) */}
        <Card className="lg:col-span-2 border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  {t("dashboard.chart_title")}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {t("dashboard.chart_subtitle")}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/reports/accounting">
                  {t("action.detail")} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3 pt-4">
                <Skeleton className="h-52 w-full" />
              </div>
            ) : chartTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 gap-2 text-muted-foreground">
                <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
                <span className="text-xs">Belum ada data grafik.</span>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTrends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}j`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={25}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `📅 ${label}`}
                          formatter={(value, name) => [
                            name === "total_revenue"
                              ? `Rp ${Number(value).toLocaleString("id-ID")}`
                              : `${Number(value).toLocaleString("id-ID")} orders`,
                            name === "total_revenue" ? "Omset (Revenue)" : "Total Orders",
                          ]}
                        />
                      }
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_revenue"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      fill="url(#dashRevenue)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="total_orders"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      fill="url(#dashOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Action Required Widget (1 Column) */}
        <Card className="border-border/60 transition-shadow hover:shadow-md flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              {t("dashboard.action_required")}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {t("dashboard.action_required_sub")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5 flex-1 flex flex-col justify-center">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <>
                {/* 1. Unverified Payments */}
                <Link
                  to="/payments"
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200/70 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Pembayaran Menunggu Verifikasi</p>
                      <p className="text-[11px] text-muted-foreground">Verifikasi bukti transfer dari pelanggan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs">
                      {actionRequired?.unverified_payments_count ?? 0}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                {/* 2. Ready Orders */}
                <Link
                  to="/orders"
                  search={{ page: 1, search: "", order_status: "ready", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}
                  className="flex items-center justify-between p-3 rounded-lg border border-indigo-200/70 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Order Siap Kirim (Ready)</p>
                      <p className="text-[11px] text-muted-foreground">Pesanan selesai produksi Siap Kirim</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                      {actionRequired?.ready_orders_count ?? 0}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                {/* 3. Pending Orders */}
                <Link
                  to="/orders"
                  search={{ page: 1, search: "", order_status: "pending", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}
                  className="flex items-center justify-between p-3 rounded-lg border border-blue-200/70 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Order Pending Approval</p>
                      <p className="text-[11px] text-muted-foreground">Order baru menunggu pembayaran DP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                      {actionRequired?.pending_orders_count ?? 0}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BARIS 3: Tabel Symmetrical Recent Orders & Recent Payments ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Table */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  {t("dashboard.recent_orders")}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {t("dashboard.recent_orders_sub")}
                </CardDescription>
              </div>
              {!isLoading && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {recentOrders.length} orders
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap pl-5 py-3 text-xs">Invoice</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-xs">Pelanggan</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-center text-xs">Status</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3 text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {!isLoading && recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-xs">Belum ada order.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  recentOrders.map((o) => (
                    <TableRow key={o.id} className="group hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs pl-5 text-muted-foreground">
                        <Link to="/orders/$orderId" params={{ orderId: o.id }} className="hover:text-primary hover:underline underline-offset-2 font-medium">
                          {o.order_number ?? o.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap text-xs">
                        {o.customer?.name ?? (o as any).customer_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={o.order_status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs pr-5 tabular-nums">
                        {formatIDR(o.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  {t("dashboard.recent_payments")}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {t("dashboard.recent_payments_sub")}
                </CardDescription>
              </div>
              {!isLoading && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {recentPayments.length} transaksi
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap pl-5 py-3 text-xs">Tanggal</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-xs">Tipe</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-center text-xs">Status</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3 text-xs">Nominal (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {!isLoading && recentPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Wallet className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-xs">Belum ada transaksi pembayaran.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  recentPayments.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-xs pl-5 whitespace-nowrap text-muted-foreground">
                        {formatDate(p.created_at || p.payment_date)}
                      </TableCell>
                      <TableCell>
                        <PaymentTypeBadge type={p.payment_type} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          p.status === "verified"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}>
                          {p.status === "verified" ? "Verified" : "Pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs pr-5 tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatIDR(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
