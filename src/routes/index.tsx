import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  ordersService,
  paymentsService,
  dashboardService,
  batchPosService,
  accountingReportService,
} from "@/lib/services";
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
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  production: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  ready: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  canceled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

const paymentTypeVariant: Record<string, { label: string; className: string }> = {
  dp: { label: "DP", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  settlement: { label: "Pelunasan", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  installment: { label: "Cicilan", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}
    >
      {status ?? "—"}
    </span>
  );
}

function PaymentTypeBadge({ type }: { type: string }) {
  const cfg = paymentTypeVariant[type?.toLowerCase()] ?? {
    label: type || "—",
    className: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${cfg.className}`}
    >
      {cfg.label}
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

/** Helper for 14-day date range */
function getPastRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    startDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    endDate: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

const chartConfig = {
  omset_amount: {
    label: "Omset",
    color: "var(--color-chart-1)",
  },
  cash_in: {
    label: "Cash-In",
    color: "var(--color-chart-2)",
  },
};

function Dashboard() {
  const [range] = useState(() => getPastRange(14));

  // Queries
  const orders = useQuery({
    queryKey: ["orders", { page: 1, limit: 6 }],
    queryFn: () => ordersService.list({ page: 1, limit: 6 }),
  });

  const payments = useQuery({
    queryKey: ["payments", { page: 1, limit: 6 }],
    queryFn: () => paymentsService.list({ page: 1, limit: 6 }),
  });

  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardService.summary(),
  });

  const activeBatchPOs = useQuery({
    queryKey: ["active-batch-pos"],
    queryFn: () => batchPosService.active(),
  });

  const trendQuery = useQuery({
    queryKey: ["dashboard-trend-14", range.startDate, range.endDate],
    queryFn: () => accountingReportService.get(range.startDate, range.endDate),
  });

  // Action required queries
  const pendingPayments = useQuery({
    queryKey: ["payments-pending"],
    queryFn: () => paymentsService.list({ page: 1, limit: 100 }),
  });

  const readyOrders = useQuery({
    queryKey: ["orders-ready"],
    queryFn: () => ordersService.list({ page: 1, limit: 100, order_status: "ready" }),
  });

  const pendingOrders = useQuery({
    queryKey: ["orders-pending"],
    queryFn: () => ordersService.list({ page: 1, limit: 100, order_status: "pending" }),
  });

  // Derived Values
  const totalOrders = summary.data?.data?.total_active_orders ?? 0;
  const totalRevenue = summary.data?.data?.total_revenue ?? 0;
  const totalReceivable = summary.data?.data?.total_receivable ?? 0;

  const firstActivePO = activeBatchPOs.data?.data?.[0] ?? null;

  const chartData = (trendQuery.data?.data?.daily_trends ?? []).map((d) => ({
    ...d,
    label: shortDate(d.date),
  }));

  const pendingPaymentsCount = (pendingPayments.data?.data ?? []).filter(
    (p) => p.status === "pending" || !p.status
  ).length;

  const readyOrdersCount = readyOrders.data?.data?.length ?? 0;
  const pendingOrdersCount = pendingOrders.data?.data?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ringkasan operasional konveksi, tren omset, dan tindakan yang membutuhkan perhatian.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/orders" search={{ page: 1, search: "", order_status: "", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}>
            Kelola Orders <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* ── BARIS 1: Top Hero Metric Cards (4 Columns) ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Active Orders */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl p-2.5 shrink-0 bg-violet-100 dark:bg-violet-900/40">
                <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                {summary.isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Active Orders</p>
                    <p className="text-xl font-bold tabular-nums leading-tight text-violet-700 dark:text-violet-300">
                      {totalOrders.toLocaleString("id-ID")} orders
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Sedang dalam proses</p>
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
                {summary.isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Total Omset</p>
                    <p className="text-xl font-bold tabular-nums leading-tight text-emerald-700 dark:text-emerald-300">
                      {formatIDR(totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Order approved & lunas</p>
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
                  {summary.isLoading ? (
                    <div className="space-y-2 pt-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Total Piutang</p>
                      <p className="text-xl font-bold tabular-nums leading-tight text-amber-700 dark:text-amber-300">
                        {formatIDR(totalReceivable)}
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
                {activeBatchPOs.isLoading ? (
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ) : firstActivePO ? (
                  <>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {firstActivePO.name}
                      </p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                        Active
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {firstActivePO.quota.toLocaleString("id-ID")} Pcs Target
                    </p>
                    <div className="mt-2 space-y-1">
                      <Progress value={Math.min(100, Math.round((380 / (firstActivePO.quota || 500)) * 100))} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Kuota PO Aktif</span>
                        <span>380 / {firstActivePO.quota} Pcs</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Active Batch PO</p>
                    <p className="text-sm font-semibold text-foreground">Tidak Ada PO Aktif</p>
                    <p className="text-xs text-muted-foreground mt-1">Buat Batch PO baru</p>
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
                  Tren Omset & Cash-In (14 Hari Terakhir)
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Perbandingan performa penjualan dan penerimaan kas harian
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                <Link to="/reports/accounting">
                  Detail <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {trendQuery.isLoading ? (
              <div className="space-y-3 pt-4">
                <Skeleton className="h-52 w-full" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 gap-2 text-muted-foreground">
                <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
                <span className="text-xs">Belum ada data grafik 14 hari terakhir.</span>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashOmset" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="dashCashIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}j`} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => `📅 ${label}`}
                          formatter={(value, name) => [
                            `Rp ${Number(value).toLocaleString("id-ID")}`,
                            name === "omset_amount" ? "Omset" : "Cash-In",
                          ]}
                        />
                      }
                    />
                    <Area type="monotone" dataKey="omset_amount" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#dashOmset)" />
                    <Area type="monotone" dataKey="cash_in" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#dashCashIn)" />
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
              Butuh Tindakan Operasional
            </CardTitle>
            <CardDescription className="mt-0.5">
              Daftar antrean transaksi yang memerlukan verifikasi atau pengiriman
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* 1. Pending Payments */}
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
                  {pendingPaymentsCount}
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
                  {readyOrdersCount}
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
                  {pendingOrdersCount}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
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
                  Recent Orders
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Order terbaru yang baru dibuat di seluruh Batch PO
                </CardDescription>
              </div>
              {!orders.isLoading && orders.data?.data && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {orders.data.data.length} orders
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap pl-5 py-3 text-xs">Invoice</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-xs">Customer</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-center text-xs">Status</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3 text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {orders.isError && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive py-8 text-xs">
                      Gagal memuat data order
                    </TableCell>
                  </TableRow>
                )}
                {!orders.isLoading && !orders.isError && orders.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-xs">Belum ada order.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!orders.isLoading && orders.data?.data?.map((o) => (
                  <TableRow key={o.id} className="group hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs pl-5 text-muted-foreground">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="hover:text-primary hover:underline underline-offset-2 font-medium">
                        {o.order_number ?? o.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap text-xs">{o.customer?.name ?? "—"}</TableCell>
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
                  Recent Payments
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Transaksi pembayaran & uang masuk terbaru
                </CardDescription>
              </div>
              {!payments.isLoading && payments.data?.data && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {payments.data.data.length} transaksi
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
                {payments.isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {payments.isError && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive py-8 text-xs">
                      Gagal memuat data pembayaran
                    </TableCell>
                  </TableRow>
                )}
                {!payments.isLoading && !payments.isError && payments.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-1.5">
                        <Wallet className="h-6 w-6 text-muted-foreground/30" />
                        <span className="text-xs">Belum ada transaksi pembayaran.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!payments.isLoading && payments.data?.data?.map((p) => (
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
