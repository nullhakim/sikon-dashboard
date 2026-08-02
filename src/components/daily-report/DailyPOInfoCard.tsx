import type { DailyReportPOInfo } from "@/lib/types/daily-report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Target, PackageMinus, CalendarRange } from "lucide-react";

interface DailyPOInfoCardProps {
  data: DailyReportPOInfo | null | undefined;
  isLoading: boolean;
}

/** Formats YYYY-MM-DD → "1 Jul 2026" */
function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Active PO information card with quota progress bar.
 * Shows PO name, date range, total quota, and remaining quota at a glance.
 */
export function DailyPOInfoCard({ data, isLoading }: DailyPOInfoCardProps) {
  const d = data ?? {} as DailyReportPOInfo;
  const quota = d.quota ?? 0;
  const remaining_quota = d.remaining_quota ?? 0;
  const po_name = d.po_name ?? "-";
  const used = quota - remaining_quota;
  const pct = quota > 0 ? Math.round((used / quota) * 100) : 0;

  const hasDateRange = d.start_date || d.end_date;

  // Color based on usage
  const progressColor =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="pt-5 pb-4 px-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-36" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardContent className="pt-5 pb-4 px-5 space-y-4">
        {/* PO Name + Date Range */}
        <div className="flex items-start gap-2.5">
          <div className="rounded-xl p-2.5 shrink-0 bg-indigo-100 dark:bg-indigo-900/40">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">PO Aktif</p>
            <p className="text-lg font-bold tracking-tight text-foreground">
              {po_name}
            </p>
            {hasDateRange && (
              <div className="flex items-center gap-1.5 mt-1">
                <CalendarRange className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {formatShortDate(d.start_date)} — {formatShortDate(d.end_date)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quota Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Kuota</span>
            </div>
            <p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-300">
              {quota.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <PackageMinus className="h-3 w-3 text-cyan-500" />
              <span className="text-xs text-muted-foreground font-medium">Sisa</span>
            </div>
            <p className="text-base font-bold tabular-nums text-cyan-700 dark:text-cyan-300">
              {remaining_quota.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground font-medium">Terpakai</span>
            <p className="text-base font-bold tabular-nums text-foreground">
              {pct}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {used.toLocaleString("id-ID")} / {quota.toLocaleString("id-ID")} pcs
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
