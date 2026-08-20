import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  Building2,
  TrendingUp,
  Percent,
  ShieldCheck,
  FileText,
} from "lucide-react";

import { taxReportService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

export function TaxAnnualReport() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["tax-annual-report", selectedYear],
    queryFn: () => taxReportService.getAnnual(selectedYear),
    retry: 1,
    // Prevent from running during SSR (no auth token available server-side)
    enabled: typeof window !== "undefined",
  });

  const reportData = data?.data;

  // ── Derived values from actual API field names ──────────────────────────────
  const totalOmset      = reportData?.total_annual_revenue ?? 0;
  const totalTaxDue     = reportData?.total_tax_payable ?? 0;
  const entityType      = reportData?.entity_type ?? "CV";
  const taxType         = reportData?.tax_type ?? "PPh Final UMKM (PP 55/2022)";
  const isExceeds       = reportData?.is_exceeds_threshold ?? false;
  const monthlyList     = reportData?.monthly_breakdowns ?? [];

  const thresholdLabel  = isExceeds ? "Melebihi Rp 4.8 Miliar" : "Di bawah Rp 4.8 Miliar";
  const thresholdColor  = isExceeds
    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-800"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";

  // Year options for Select
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6">
      {/* ── Header Filter & Entity Badge ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Year Filter */}
          <div className="space-y-1">
            <Label htmlFor="tax-year-select" className="text-xs text-muted-foreground font-medium block">
              Tahun Pajak
            </Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger id="tax-year-select" className="w-[150px] h-9 text-xs">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">
                    Tahun {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh Data Pajak"
            className="h-9 w-9 mt-5"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Entity & Tax Type Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="py-1.5 px-3 bg-muted/40 border-border/80 text-xs font-semibold text-foreground flex items-center gap-2"
          >
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>
              Bentuk Usaha: {isLoading ? "…" : `${entityType} (${taxType})`}
            </span>
          </Badge>
          {isFetching && !isLoading && (
            <Badge variant="outline" className="text-xs gap-1.5 py-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Memperbarui…
            </Badge>
          )}
        </div>
      </div>

      {/* ── Error State ── */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Gagal memuat data laporan pajak</p>
            <p className="text-sm text-muted-foreground mt-1">
              Terjadi kesalahan saat mengambil data estimasi pajak tahun {selectedYear}.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* ── Main Content ── */}
      {(!isError || isLoading) && (
        <>
          {/* ── 3 Top Summary Cards ── */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Card 1: Total Omset Tahunan */}
            <Card className="border-t-4 border-t-blue-500 border-x border-b border-border/60 transition-all hover:shadow-md">
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Omset Tahunan ({selectedYear})
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-3/4 my-1" />
                    ) : (
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">
                        {formatIDR(totalOmset)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Akumulasi peredaran bruto 12 bulan
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-blue-100 dark:bg-blue-900/40 shrink-0">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Total Pajak Terutang */}
            <Card className="border-t-4 border-t-amber-500 border-x border-b border-border/60 transition-all hover:shadow-md">
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Total Pajak Terutang (0.5% × Omset)
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-3/4 my-1" />
                    ) : (
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-tight">
                        {formatIDR(totalTaxDue)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Estimasi kewajiban {taxType}
                    </p>
                  </div>
                  <div className="rounded-xl p-3 bg-amber-100 dark:bg-amber-900/40 shrink-0">
                    <Percent className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Status Threshold */}
            <Card className={`border-t-4 ${isExceeds ? "border-t-red-500" : "border-t-emerald-500"} border-x border-b border-border/60 transition-all hover:shadow-md`}>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status Threshold Omset
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-3/4 my-1" />
                    ) : (
                      <div className="pt-1 pb-1">
                        <Badge className={`font-semibold px-3 py-1 text-sm gap-1.5 ${thresholdColor}`}>
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          <span>{thresholdLabel}</span>
                        </Badge>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Batas PPh Final (Maks. Rp 4,8 M / tahun)
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 shrink-0 ${isExceeds ? "bg-red-100 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"}`}>
                    <ShieldCheck className={`h-6 w-6 ${isExceeds ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Datatable Breakdown Bulanan (12 Bulan) ── */}
          <Card className="border-border/60">
            <CardHeader className="py-4 px-6 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Rincian Estimasi Pajak PPh Final Per Bulan
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Breakdown omset bruto dan perhitungan pajak 0.5% untuk 12 bulan pada tahun {selectedYear}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-medium">
                  12 Periode Bulan
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[200px] text-xs font-semibold">Bulan</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Omset Sah (Rp)</TableHead>
                      <TableHead className="text-center text-xs font-semibold w-[140px]">Tarif Pajak</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Pajak Terutang (Rp)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 6 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      : monthlyList.map((row) => {
                          const hasRevenue = row.gross_revenue > 0;
                          return (
                            <TableRow
                              key={row.month}
                              className={`transition-colors ${hasRevenue ? "hover:bg-blue-50/40 dark:hover:bg-blue-950/20" : "hover:bg-muted/30 text-muted-foreground"}`}
                            >
                              <TableCell className="font-medium text-xs">
                                {row.month_name} {selectedYear}
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs tabular-nums">
                                {hasRevenue ? formatIDR(row.gross_revenue) : (
                                  <span className="text-muted-foreground/60">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                >
                                  {(row.tax_rate * 100).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-right text-xs tabular-nums font-semibold ${hasRevenue ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60"}`}>
                                {hasRevenue ? formatIDR(row.tax_payable) : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                  </TableBody>

                  {/* Total Footer */}
                  {!isLoading && (
                    <TableFooter className="bg-muted/60 border-t-2 border-border font-semibold text-xs">
                      <TableRow>
                        <TableCell className="font-bold text-foreground">
                          TOTAL TAHUN {selectedYear}
                        </TableCell>
                        <TableCell className="text-right font-bold text-foreground tabular-nums">
                          {formatIDR(totalOmset)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-muted-foreground text-[11px]">PPh Final 0.5%</span>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-amber-600 dark:text-amber-400 tabular-nums text-sm">
                          {formatIDR(totalTaxDue)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
