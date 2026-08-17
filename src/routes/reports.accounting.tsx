import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  FileX,
} from "lucide-react";

import { accountingReportService } from "@/lib/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { SummaryCards } from "@/components/accounting-report/SummaryCards";
import { DailyTrendChart } from "@/components/accounting-report/DailyTrendChart";
import { SalesPerformanceTable } from "@/components/accounting-report/SalesPerformanceTable";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting Report — SIKOn ERP" },
      {
        name: "description",
        content:
          "Laporan keuangan: omset, cash-in, piutang, dan kinerja sales berdasarkan rentang tanggal.",
      },
    ],
  }),
  component: AccountingReportDashboard,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getFirstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function getLastMonthRange(): { start: string; end: string } {
  const d = new Date();
  const firstDayLastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const lastDayLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);
  return {
    start: `${firstDayLastMonth.getFullYear()}-${pad(firstDayLastMonth.getMonth() + 1)}-${pad(firstDayLastMonth.getDate())}`,
    end: `${lastDayLastMonth.getFullYear()}-${pad(lastDayLastMonth.getMonth() + 1)}-${pad(lastDayLastMonth.getDate())}`,
  };
}

function getThisYearRange(): { start: string; end: string } {
  const d = new Date();
  return {
    start: `${d.getFullYear()}-01-01`,
    end: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AccountingReportDashboard() {
  const today = getTodayString();
  const firstDay = getFirstDayOfMonth();

  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(today);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["accounting-report", startDate, endDate],
    queryFn: () => accountingReportService.get(startDate, endDate),
    retry: 1,
  });

  const report = data?.data ?? null;
  const summary = report?.summary;
  const dailyTrends = report?.daily_trends ?? [];
  const salesPerformances = report?.sales_performances ?? [];

  const isDefaultRange = startDate === firstDay && endDate === today;

  const handleSelectPreset = (preset: "today" | "this_month" | "last_month" | "this_year") => {
    if (preset === "today") {
      const t = getTodayString();
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "this_month") {
      setStartDate(getFirstDayOfMonth());
      setEndDate(getTodayString());
    } else if (preset === "last_month") {
      const { start, end } = getLastMonthRange();
      setStartDate(start);
      setEndDate(end);
    } else if (preset === "this_year") {
      const { start, end } = getThisYearRange();
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Consider empty if we successfully fetched, but there are no daily trends AND no sales performances
  const isEmpty =
    !isLoading &&
    !isError &&
    dailyTrends.length === 0 &&
    salesPerformances.length === 0 &&
    summary?.total_omset === 0;

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          isFetching={isFetching}
          refetch={refetch}
          onSelectPreset={handleSelectPreset}
        />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Gagal memuat laporan</p>
            <p className="text-sm text-muted-foreground mt-1">
              Terjadi kesalahan saat mengambil data dari server.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        isFetching={isFetching}
        refetch={refetch}
        onSelectPreset={handleSelectPreset}
      />

      {/* ── Date Context Badge ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {formatDateLabel(startDate)} — {formatDateLabel(endDate)}
          </span>
        </div>
        {isDefaultRange && (
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold">
            Bulan Ini
          </Badge>
        )}
        {isFetching && !isLoading && (
          <Badge variant="outline" className="text-xs gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Memperbarui…
          </Badge>
        )}
      </div>

      {/* ── Empty State ── */}
      {!isLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Tidak ada transaksi</p>
            <p className="text-sm text-muted-foreground mt-1">
              Belum ada transaksi yang tercatat pada periode ini.
              <br />
              Coba ubah rentang tanggal.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content ── */}
      {(isLoading || !isEmpty) && (
        <>
          {/* ── Section 1: Summary Cards (Top Hero + P&L Breakdown) ── */}
          <SummaryCards data={summary} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 2: Trend Chart ── */}
          <DailyTrendChart data={dailyTrends} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 3: Sales Performance ── */}
          <SalesPerformanceTable data={salesPerformances} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  isFetching: boolean;
  refetch: () => void;
  onSelectPreset: (preset: "today" | "this_month" | "last_month" | "this_year") => void;
}

function PageHeader({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isFetching,
  refetch,
  onSelectPreset,
}: PageHeaderProps) {
  const today = getTodayString();
  const firstDay = getFirstDayOfMonth();
  const { start: lmStart, end: lmEnd } = getLastMonthRange();
  const { start: tyStart, end: tyEnd } = getThisYearRange();

  const isToday = startDate === today && endDate === today;
  const isThisMonth = startDate === firstDay && endDate === today;
  const isLastMonth = startDate === lmStart && endDate === lmEnd;
  const isThisYear = startDate === tyStart && endDate === tyEnd;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Accounting Report
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Laporan keuangan — Omset, cash-in, P&L, dan kinerja sales.
        </p>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        {/* Quick Date Presets */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground font-medium block">
            Filter Shortcut
          </Label>
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shadow-sm">
            <Button
              type="button"
              variant={isToday ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs font-medium"
              onClick={() => onSelectPreset("today")}
            >
              Hari Ini
            </Button>
            <Button
              type="button"
              variant={isThisMonth ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs font-medium"
              onClick={() => onSelectPreset("this_month")}
            >
              Bulan Ini
            </Button>
            <Button
              type="button"
              variant={isLastMonth ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs font-medium"
              onClick={() => onSelectPreset("last_month")}
            >
              Bulan Lalu
            </Button>
            <Button
              type="button"
              variant={isThisYear ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs font-medium"
              onClick={() => onSelectPreset("this_year")}
            >
              Tahun Ini
            </Button>
          </div>
        </div>

        {/* Date Inputs */}
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label
              htmlFor="acc-start-date"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Dari Tanggal
            </Label>
            <Input
              id="acc-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="acc-end-date"
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Sampai Tanggal
            </Label>
            <Input
              id="acc-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 text-xs h-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh data"
            className="shrink-0 h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
