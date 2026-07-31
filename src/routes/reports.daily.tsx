import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  FileX,
} from "lucide-react";

import { dailyReportService } from "@/lib/services";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { DailyPOInfoCard } from "@/components/daily-report/DailyPOInfoCard";
import { DailyOrderSummaryCard } from "@/components/daily-report/DailyOrderSummaryCard";
import { DailyFinancialCards } from "@/components/daily-report/DailyFinancialCards";
import { DailySalesDetailTable } from "@/components/daily-report/DailySalesDetailTable";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/daily")({
  head: () => ({
    meta: [
      { title: "Daily Report — SIKOn ERP" },
      {
        name: "description",
        content:
          "Laporan operasional harian: Info PO aktif, ringkasan order, keuangan, dan pencapaian sales.",
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
    queryKey: ["daily-report", selectedDate],
    queryFn: () => dailyReportService.get(selectedDate),
    retry: 1,
  });

  const report = data?.data ?? null;
  const isToday = selectedDate === today;

  // Consider empty if fetched but no PO info and no sales
  const isEmpty =
    !isLoading &&
    !isError &&
    !report?.po_info?.po_id &&
    (report?.sales_details ?? []).length === 0;

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
          resetToToday={() => setSelectedDate(today)}
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
        resetToToday={() => setSelectedDate(today)}
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

      {/* ── Empty State ── */}
      {!isLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Tidak ada data harian</p>
            <p className="text-sm text-muted-foreground mt-1">
              Belum ada aktivitas operasional yang tercatat pada tanggal ini.
              <br />
              Coba pilih tanggal lain atau pastikan ada PO yang aktif.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content ── */}
      {(isLoading || !isEmpty) && (
        <>
          {/* ── Section 1: PO Info + Order Summary ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <DailyPOInfoCard data={report?.po_info} isLoading={isLoading} />
            <DailyOrderSummaryCard data={report?.order_summary} isLoading={isLoading} />
          </div>

          <Separator className="my-2" />

          {/* ── Section 2: Financial Summary ── */}
          <DailyFinancialCards data={report?.financial_summary} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 3: Sales Detail Table ── */}
          <DailySalesDetailTable
            data={report?.sales_details ?? []}
            isLoading={isLoading}
          />
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
  resetToToday: () => void;
}

function PageHeader({
  selectedDate,
  setSelectedDate,
  isFetching,
  refetch,
  isToday,
  resetToToday,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Daily Report
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Laporan operasional harian — Briefing pagi untuk memantau aktivitas PO aktif.
        </p>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <Label
            htmlFor="daily-date"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Pilih Tanggal
          </Label>
          <Input
            id="daily-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
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
            onClick={resetToToday}
            className="text-xs text-primary hover:text-primary"
          >
            Kembali ke Hari Ini
          </Button>
        )}
      </div>
    </div>
  );
}
