import type { ActivePO } from "@/lib/types/daily-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { Package, TrendingUp, BarChart3 } from "lucide-react";

interface ActivePOSectionProps {
  data: ActivePO[];
  isLoading: boolean;
}

interface POMetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

/** Single metric row inside a PO card. */
function POMetricRow({ icon, label, value }: POMetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Renders each active PO as an individual card with key metrics.
 */
export function ActivePOSection({ data, isLoading }: ActivePOSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active Purchase Orders</CardTitle>
        <CardDescription>PO yang sedang berjalan beserta progres penerimaan.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-center py-6 text-sm text-muted-foreground">Memuat data…</p>
        )}
        {!isLoading && data.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">
            Tidak ada PO aktif saat ini.
          </p>
        )}
        {!isLoading && data.length > 0 && (
          <div className="space-y-4">
            {data.map((po) => (
              <div
                key={po.batch_po_id}
                className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-tight">{po.batch_po_name}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                    Aktif
                  </Badge>
                </div>
                <div className="space-y-2">
                  <POMetricRow
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label="Total Revenue Masuk"
                    value={formatIDR(po.total_revenue_entered)}
                  />
                  <POMetricRow
                    icon={<Package className="h-3.5 w-3.5" />}
                    label="Qty Diterima"
                    value={po.total_qty_received.toLocaleString("id-ID")}
                  />
                  <POMetricRow
                    icon={<BarChart3 className="h-3.5 w-3.5" />}
                    label="Sisa Kuota"
                    value={po.remaining_quota.toLocaleString("id-ID")}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
