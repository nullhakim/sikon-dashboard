import type { POInfo } from "@/lib/types/daily-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package2, AlertTriangle, CheckCircle } from "lucide-react";

interface POInfoCardProps {
  data: POInfo | null | undefined;
  isLoading: boolean;
}

function getCapacityColor(usedPercent: number): {
  bar: string;
  text: string;
  badge: string;
} {
  if (usedPercent > 80) {
    return {
      bar: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    };
  }
  if (usedPercent >= 50) {
    return {
      bar: "bg-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  return {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };
}

/**
 * Displays the active PO header information with dynamic capacity progress bar.
 * Color: Green <50%, Yellow 50-80%, Red >80%.
 * Accepts `data` as the `po_info` sub-object from the API response.
 */
export function POInfoCard({ data, isLoading }: POInfoCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-between gap-3">
            <Skeleton className="h-14 flex-1 rounded-lg" />
            <Skeleton className="h-14 flex-1 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.po_name) {
    return (
      <Card className="border-border/60 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <Package2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground text-center">
            Tidak ada PO aktif untuk tanggal ini.
          </p>
        </CardContent>
      </Card>
    );
  }

  const usedQty = data.quota - data.remaining_quota;
  const usedPercent = data.quota > 0 ? Math.min((usedQty / data.quota) * 100, 100) : 0;
  const colors = getCapacityColor(usedPercent);

  const StatusIcon =
    usedPercent > 80 ? AlertTriangle : CheckCircle;

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">{data.po_name}</CardTitle>
            <CardDescription className="mt-0.5">Purchase Order Aktif</CardDescription>
          </div>
          <Badge className={`shrink-0 border-0 text-xs font-medium ${colors.badge}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {usedPercent.toFixed(0)}% Terpakai
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quota Numbers */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {usedQty.toLocaleString("id-ID")}
          </span>
          <span className="text-sm text-muted-foreground mb-1">
            / {data.quota.toLocaleString("id-ID")} pcs
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Kapasitas Total</p>
            <p className="text-sm font-semibold tabular-nums">
              {data.quota.toLocaleString("id-ID")} pcs
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Sisa Kuota</p>
            <p className={`text-sm font-semibold tabular-nums ${colors.text}`}>
              {data.remaining_quota.toLocaleString("id-ID")} pcs
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
