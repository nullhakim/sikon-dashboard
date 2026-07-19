import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, TrendingUp, ShoppingBag, RefreshCw } from "lucide-react";

import { dailyReportService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { StatCard } from "@/components/daily-report/StatCard";
import { SalesPerformanceTable } from "@/components/daily-report/SalesPerformanceTable";
import { ActivePOSection } from "@/components/daily-report/ActivePOSection";
import { ReceivablesSummary } from "@/components/daily-report/ReceivablesSummary";
import { PastDueReceivablesTable } from "@/components/daily-report/PastDueReceivablesTable";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/daily")({
  head: () => ({
    meta: [
      { title: "Daily Report — SIKOn ERP" },
      { name: "description", content: "Snapshot harian: revenue, qty, PO aktif, dan piutang." },
    ],
  }),
  component: DailyReportDashboard,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns today's date as a YYYY-MM-DD string in local timezone. */
function getTodayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DailyReportDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["daily-report", selectedDate],
    queryFn: () => dailyReportService.get(selectedDate),
  });

  const report = data?.data;
  const snapshot = report?.daily_snapshot;

  const summaryStats = [
    {
      label: "Total Revenue Hari Ini",
      value: formatIDR(snapshot?.total_revenue_today),
      hint: "Dari semua transaksi yang tercatat",
      icon: TrendingUp,
      accentClass: "text-emerald-500",
    },
    {
      label: "Total Qty Hari Ini",
      value: snapshot?.total_qty_today?.toLocaleString("id-ID") ?? "—",
      hint: "Jumlah item yang terjual",
      icon: ShoppingBag,
      accentClass: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daily Report</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot performa harian — revenue, penjualan, PO aktif, dan piutang.
          </p>
        </div>

        {/* ── Date Filter ── */}
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="daily-date-picker" className="flex items-center gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5" />
              Tanggal
            </Label>
            <Input
              id="daily-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales Performance Table — takes up 2/3 on large screens */}
        <div className="lg:col-span-2">
          <SalesPerformanceTable
            data={snapshot?.sales_performance_today ?? []}
            isLoading={isLoading}
          />
        </div>

        {/* Active PO Section — 1/3 column */}
        <div>
          <ActivePOSection
            data={report?.active_pos ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* ── Receivables Summary ── */}
      <ReceivablesSummary
        totalOutstanding={report?.total_outstanding_receivables ?? 0}
        activePOReceivables={report?.active_po_receivables ?? 0}
        isLoading={isLoading}
      />

      {/* ── Past Due Receivables ── */}
      <PastDueReceivablesTable
        data={report?.past_due_receivables ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
