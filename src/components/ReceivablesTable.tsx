import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingDown, Receipt, AlertCircle, Loader2 } from "lucide-react";

import { reportsService, type ReceivableRow } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

// ─── Badge Warna PO Status ──────────────────────────────────────────────────

const poStatusBadge: Record<string, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  closed: {
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-500",
    dot: "bg-slate-400",
  },
  draft: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
};

function POStatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const cls = poStatusBadge[s] ?? {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls.bg} ${cls.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cls.dot}`} />
      {status || "—"}
    </span>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-orange-200 bg-orange-50/50" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            highlight ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-base font-semibold leading-tight ${
              highlight ? "text-orange-700" : "text-foreground"
            }`}
          >
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={j}>
              <div
                className="h-4 rounded bg-muted"
                style={{ width: `${60 + ((i * 7 + j) % 4) * 10}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={7}>
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Receipt className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              {filtered ? "Tidak ada hasil" : "Tidak ada piutang aktif"}
            </p>
            <p className="text-sm">
              {filtered
                ? "Coba ubah kata kunci pencarian."
                : "Semua tagihan sudah terbayar lunas."}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ReceivablesTable() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["reports-receivables"],
    queryFn: () => reportsService.receivables(),
    staleTime: 60_000, // 1 minute cache
  });

  const rows: ReceivableRow[] = useMemo(() => {
    const raw: ReceivableRow[] = data?.data ?? [];
    // Sorted by outstanding_amount DESC (server should already do this, but ensure on client too)
    const sorted = [...raw].sort((a, b) => b.outstanding_amount - a.outstanding_amount);

    if (!search.trim()) return sorted;

    const q = search.toLowerCase();
    return sorted.filter(
      (r) =>
        r.order_number?.toLowerCase().includes(q) ||
        r.customer_name?.toLowerCase().includes(q) ||
        r.sales_name?.toLowerCase().includes(q) ||
        r.po_name?.toLowerCase().includes(q),
    );
  }, [data, search]);

  // Summary metrics
  const totalOutstanding = useMemo(
    () => (data?.data ?? []).reduce((s, r) => s + (r.outstanding_amount || 0), 0),
    [data],
  );
  const totalBilled = useMemo(
    () => (data?.data ?? []).reduce((s, r) => s + (r.total_amount || 0), 0),
    [data],
  );
  const totalOrders = data?.data?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={AlertCircle}
          label="Total Piutang (Outstanding)"
          value={formatIDR(totalOutstanding)}
          sub={`dari ${totalOrders} pesanan`}
          highlight
        />
        <SummaryCard
          icon={TrendingDown}
          label="Total Tagihan (Bruto)"
          value={formatIDR(totalBilled)}
        />
        <SummaryCard
          icon={Receipt}
          label="Jumlah Pesanan Berpiutang"
          value={totalOrders.toString()}
          sub="belum lunas"
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="receivables-search"
          placeholder="Cari pelanggan, no. order, nama PO, atau sales..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Gagal memuat data:{" "}
            {(error as Error)?.message ?? "Terjadi kesalahan. Coba lagi."}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[130px]">No. Order</TableHead>
              <TableHead>Nama PO / Batch</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead className="text-right">Total Tagihan</TableHead>
              <TableHead className="text-right">Sudah Dibayar</TableHead>
              <TableHead className="text-right font-semibold text-orange-700">
                Sisa Piutang ↓
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState filtered={!!search.trim()} />
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.order_id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* No. Order */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-medium">
                        {row.order_number || "—"}
                      </span>
                      <POStatusBadge status={row.po_status} />
                    </div>
                  </TableCell>

                  {/* Nama PO */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {row.po_name || "—"}
                    </span>
                  </TableCell>

                  {/* Pelanggan */}
                  <TableCell>
                    <span className="font-medium text-sm">{row.customer_name || "—"}</span>
                  </TableCell>

                  {/* Sales */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{row.sales_name || "—"}</span>
                  </TableCell>

                  {/* Total Tagihan */}
                  <TableCell className="text-right text-sm">
                    {formatIDR(row.total_amount)}
                  </TableCell>

                  {/* Sudah Dibayar */}
                  <TableCell className="text-right text-sm text-emerald-700 font-medium">
                    {formatIDR(row.total_paid)}
                  </TableCell>

                  {/* Sisa Piutang — highlight */}
                  <TableCell className="text-right">
                    <span
                      className={`font-bold text-sm ${
                        row.outstanding_amount > 0
                          ? "text-orange-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatIDR(row.outstanding_amount)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      {!isLoading && rows.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Menampilkan {rows.length} dari {data?.data?.length ?? 0} data, diurutkan berdasarkan sisa piutang terbesar.
          {isLoading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
        </p>
      )}
    </div>
  );
}
