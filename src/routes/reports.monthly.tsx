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

import { monthlyReportService } from "@/lib/services";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SummaryCards } from "@/components/monthly-report/SummaryCards";
import { DailyTrendChart } from "@/components/monthly-report/DailyTrendChart";
import { MonthlySalesTable } from "@/components/monthly-report/MonthlySalesTable";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/monthly")({
  head: () => ({
    meta: [
      { title: "Monthly Report & Analytics — SIKOn ERP" },
      {
        name: "description",
        content:
          "Monitor performa bulanan: Omset, Cash-In, Piutang Baru, dan Kinerja Sales.",
      },
    ],
  }),
  component: MonthlyReportDashboard,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getAvailableYears(): number[] {
  const currentYear = getCurrentYear();
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push(i);
  }
  return years;
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MonthlyReportDashboard() {
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["monthly-report", selectedMonth, selectedYear],
    queryFn: () => monthlyReportService.get(selectedMonth, selectedYear),
    retry: 1,
  });

  const report = data?.data ?? null;

  const summary = report?.summary;
  const dailyTrends = report?.daily_trends ?? [];
  const salesPerformances = report?.sales_performances ?? [];
  const periodName = report?.period_name ?? `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;

  const isCurrentPeriod = selectedMonth === currentMonth && selectedYear === currentYear;
  
  // Consider empty if we successfully fetched, but there are no daily trends AND no sales performances
  const isEmpty = !isLoading && !isError && dailyTrends.length === 0 && salesPerformances.length === 0 && summary?.total_omset === 0;

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          isFetching={isFetching}
          refetch={refetch}
          isCurrentPeriod={isCurrentPeriod}
          currentMonth={currentMonth}
          currentYear={currentYear}
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
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        isFetching={isFetching}
        refetch={refetch}
        isCurrentPeriod={isCurrentPeriod}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {/* ── Date Context Badge ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {periodName}
          </span>
        </div>
        {isCurrentPeriod && (
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
              Pilih bulan/tahun lain.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content (show when loading OR when data exists) ── */}
      {(isLoading || !isEmpty) && (
        <>
          {/* ── Section 1: Summary Cards ── */}
          <SummaryCards data={summary} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 2: Trend Chart ── */}
          <DailyTrendChart data={dailyTrends} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 3: Sales Performance ── */}
          <MonthlySalesTable data={salesPerformances} isLoading={isLoading} />
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  isFetching: boolean;
  refetch: () => void;
  isCurrentPeriod: boolean;
  currentMonth: number;
  currentYear: number;
}

function PageHeader({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  isFetching,
  refetch,
  isCurrentPeriod,
  currentMonth,
  currentYear,
}: PageHeaderProps) {
  const years = getAvailableYears();

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Monthly Report & Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor performa bulanan — Omset, cash-in, piutang, dan kinerja sales.
        </p>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1">
          <Label
            htmlFor="month-select"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Pilih Bulan
          </Label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(val) => setSelectedMonth(Number(val))}
            >
              <SelectTrigger id="month-select" className="w-[140px]">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger id="year-select" className="w-[100px]">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        {!isCurrentPeriod && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMonth(currentMonth);
              setSelectedYear(currentYear);
            }}
            className="text-xs text-primary hover:text-primary"
          >
            Kembali ke Bulan Ini
          </Button>
        )}
      </div>
    </div>
  );
}
