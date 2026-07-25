import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  FileX,
  ClipboardList,
} from "lucide-react";

import { dailyReportService } from "@/lib/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { POInfoCard } from "@/components/daily-report/POInfoCard";
import { OrderSummaryCards } from "@/components/daily-report/OrderSummaryCards";
import { TrendChart } from "@/components/daily-report/TrendChart";
import { FinancialSummaryCards } from "@/components/daily-report/FinancialSummaryCards";
import { SalesPerformanceTable } from "@/components/daily-report/SalesPerformanceTable";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/daily")({
  head: () => ({
    meta: [
      { title: "Daily Report & Analytics — SIKOn ERP" },
      {
        name: "description",
        content:
          "Monitor performa produksi harian secara real-time: PO aktif, tren order, finansial, dan sales performance.",
      },
    ],
  }),
  component: DailyReportDashboard,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DailyReportDashboard() {
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["daily-report-v2", selectedDate],
    queryFn: () => dailyReportService.get(selectedDate),
    retry: 1,
  });

  // ── Normalize API response — handles both nested & flat shapes ───────────
  const report = data?.data ?? null;

  // DEBUG: log raw response in development to help diagnose structure mismatches
  if (import.meta.env.DEV && report) {
    console.log("[DailyReport] raw data:", JSON.stringify(report, null, 2));
  }

  // Nested shape: report.po_info.po_name
  // Flat shape (fallback): report.po_name
  const poInfo = report?.po_info
    ? report.po_info
    : report?.po_name
      ? {
          po_id: "",
          po_name: report.po_name as string,
          quota: (report.quota as number) ?? 0,
          remaining_quota: (report.remaining_quota as number) ?? 0,
        }
      : null;

  const orderSummary = report?.order_summary
    ? report.order_summary
    : report?.qty_today !== undefined
      ? {
          qty_today: (report.qty_today as number) ?? 0,
          qty_total_po: (report.qty_total_po as number) ?? 0,
          trend_data: (report.trend_data as any[]) ?? [],
        }
      : null;

  const financialSummary = report?.financial_summary
    ? report.financial_summary
    : report?.total_revenue !== undefined
      ? {
          total_revenue: (report.total_revenue as number) ?? 0,
          total_paid: (report.total_paid as number) ?? 0,
          active_po_outstanding: (report.active_po_outstanding as number) ?? 0,
          previous_po_outstanding: (report.previous_po_outstanding as number) ?? 0,
          total_outstanding: (report.total_outstanding as number) ?? 0,
        }
      : null;

  const salesDetails = report?.sales_details ?? [];
  const trendData = report?.trend_data ?? orderSummary?.trend_data ?? [];

  const isToday = selectedDate === today;
  // PO is considered "active" if po_info has a name (after normalization)
  const hasActivePO = !isLoading && !!poInfo && poInfo.po_name != null && poInfo.po_name !== "";

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          isFetching={isFetching}
          refetch={refetch}
          isToday={isToday}
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
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isFetching={isFetching}
        refetch={refetch}
        isToday={isToday}
      />

      {/* ── Date Context Badge ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {formatDateLabel(selectedDate)}
          </span>
        </div>
        {isToday && (
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold">
            Hari Ini
          </Badge>
        )}
        {isFetching && !isLoading && (
          <Badge variant="outline" className="text-xs gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Memperbarui…
          </Badge>
        )}
      </div>

      {/* ── No PO State (only shown when done loading and no PO found) ── */}
      {!isLoading && !hasActivePO && !isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Tidak ada PO aktif</p>
            <p className="text-sm text-muted-foreground mt-1">
              Belum ada Purchase Order yang aktif pada tanggal ini.
              <br />
              Pilih tanggal lain atau buat PO baru melalui menu Batch PO.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content (show when loading OR when PO exists) ── */}
      {(isLoading || hasActivePO) && (
        <>
          {/* ── Section 1: PO Info + Order Summary ── */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <POInfoCard data={poInfo} isLoading={isLoading} />
            </div>
            <div className="lg:col-span-3 flex flex-col justify-center">
              <OrderSummaryCards data={orderSummary} isLoading={isLoading} />
            </div>
          </div>

          {/* ── Section 2: Trend Chart ── */}
          <TrendChart data={trendData} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 3: Financial Summary ── */}
          <div>
            <SectionLabel
              icon={<ClipboardList className="h-4 w-4 text-primary" />}
              title="Ringkasan Finansial"
              description="Overview keuangan PO aktif dan piutang"
            />
            <div className="mt-3">
              <FinancialSummaryCards data={financialSummary} isLoading={isLoading} />
            </div>
          </div>

          <Separator className="my-2" />

          {/* ── Section 4: Sales Performance Table ── */}
          <SalesPerformanceTable data={salesDetails} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  isFetching: boolean;
  refetch: () => void;
  isToday: boolean;
}

function PageHeader({
  selectedDate,
  setSelectedDate,
  isFetching,
  refetch,
  isToday,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Daily Report & Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor performa produksi harian — PO aktif, tren order, finansial, dan sales.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="daily-date-picker"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Pilih Tanggal
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
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
        {!isToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDate(getTodayString())}
            className="text-xs text-primary hover:text-primary"
          >
            Kembali ke Hari Ini
          </Button>
        )}
      </div>
    </div>
  );
}

interface SectionLabelProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

function SectionLabel({ icon, title, description }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-md bg-primary/10 p-1.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
