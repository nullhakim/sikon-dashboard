import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  FileX,
  FileBarChart,
} from "lucide-react";

import { poSummaryService } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { POFinancialCards } from "@/components/po-summary/POFinancialCards";
import { CustomerReceivablesTable } from "@/components/po-summary/CustomerReceivablesTable";

// Reuse production-report table patterns for product & sales summaries
import { ProductSummaryTable } from "@/components/production-report/ProductSummaryTable";
import { POSalesDetailTable } from "@/components/po-summary/POSalesDetailTable";
import { POSummaryTrendChart } from "@/components/po-summary/POSummaryTrendChart";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/po-summary/$poId")({
  head: () => ({
    meta: [
      { title: "PO Summary — SIKOn ERP" },
      {
        name: "description",
        content:
          "Rekapitulasi PO: revenue, HPP, laba bersih, piutang customer, rekap produk & sales.",
      },
    ],
  }),
  component: POSummaryDashboard,
});

// ─── Main Component ───────────────────────────────────────────────────────────

function POSummaryDashboard() {
  const { poId } = Route.useParams();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["po-summary", poId],
    queryFn: () => poSummaryService.get(poId),
    retry: 1,
    enabled: !!poId,
  });

  const report = data?.data ?? null;

  const productSummary = report?.product_summary ?? [];
  const salesSummary = report?.sales_summary ?? [];
  const customerReceivables = report?.customer_receivables ?? [];
  const trendData = report?.trend_data ?? [];
  const startDate = report?.start_date;
  const endDate = report?.end_date;
  const poName = report?.po_name;

  // Consider empty if no meaningful data
  const isEmpty =
    !isLoading &&
    !isError &&
    productSummary.length === 0 &&
    salesSummary.length === 0 &&
    customerReceivables.length === 0 &&
    report?.total_revenue === 0;

  // ── Error State ────────────────────────────────────────────────────────────
  if (isError && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader poId={poId} isFetching={isFetching} refetch={refetch} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Gagal memuat laporan</p>
            <p className="text-sm text-muted-foreground mt-1">
              Terjadi kesalahan saat mengambil data PO dari server.
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
      <PageHeader poId={poId} isFetching={isFetching} refetch={refetch} />

      {/* ── Status Badge ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
          <FileBarChart className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            PO ID: {poId.slice(0, 8)}… {poName ? `— ${poName}` : ""}
          </span>
        </div>
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
            <p className="font-semibold text-foreground">Tidak ada data PO</p>
            <p className="text-sm text-muted-foreground mt-1">
              Belum ada data yang tercatat pada PO ini.
              <br />
              Pastikan PO ID valid dan terdapat order terkait.
            </p>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content ── */}
      {(isLoading || !isEmpty) && (
        <>
          {/* ── Section 1: Financial Summary ── */}
          <POFinancialCards data={report} isLoading={isLoading} />

          <Separator className="my-2" />

          {/* ── Section 2: Trend Chart ── */}
          <POSummaryTrendChart
            data={trendData}
            startDate={startDate}
            endDate={endDate}
            isLoading={isLoading}
          />

          <Separator className="my-2" />

          {/* ── Section 3: Customer Receivables ── */}
          <CustomerReceivablesTable
            data={customerReceivables}
            isLoading={isLoading}
          />

          <Separator className="my-2" />

          {/* ── Section 4: Product Summary + Sales Summary ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductSummaryTable data={productSummary} isLoading={isLoading} />
            <POSalesDetailTable data={salesSummary} isLoading={isLoading} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  poId: string;
  isFetching: boolean;
  refetch: () => void;
}

function PageHeader({ poId, isFetching, refetch }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link to="/reports/po-summary">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Pilih PO
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          PO Summary / Closing Report
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rekapitulasi PO — Revenue, HPP, Laba Bersih, dan Daftar Piutang Customer.
        </p>
      </div>
      <div className="flex items-end gap-2">
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
      </div>
    </div>
  );
}
