import type { DailyReportOrderSummary } from "@/lib/types/daily-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ShoppingCart, TrendingUp } from "lucide-react";

interface DailyOrderSummaryCardProps {
  data: DailyReportOrderSummary | null | undefined;
  isLoading: boolean;
}

const chartConfig = {
  qty: {
    label: "Qty",
    color: "var(--color-chart-1)",
  },
};

/** Formats YYYY-MM-DD → short date, e.g. "24 Jul" */
function shortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

/**
 * Order summary card showing qty today vs total PO qty,
 * plus a mini bar chart of recent order trends from trend_data.
 */
export function DailyOrderSummaryCard({ data, isLoading }: DailyOrderSummaryCardProps) {
  const d = data ?? {} as DailyReportOrderSummary;
  const qty_today = d.qty_today ?? 0;
  const qty_total_po = d.qty_total_po ?? 0;
  const trend_data = d.trend_data ?? [];

  const chartData = trend_data.map((point) => ({
    ...point,
    label: shortDate(point.date),
  }));

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <div className="flex items-end gap-1 h-32">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${20 + Math.random() * 80}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Ringkasan Order
        </CardTitle>
        <CardDescription>
          Kuantitas order hari ini dan tren beberapa hari terakhir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Qty Stats */}
        <div className="flex items-start gap-6">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="h-3 w-3 text-violet-500" />
              <span className="text-xs text-muted-foreground font-medium">
                Qty Hari Ini
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
              {qty_today.toLocaleString("id-ID")}
              <span className="text-sm font-medium text-muted-foreground ml-1">pcs</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground font-medium">
              Total Qty PO
            </span>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {qty_total_po.toLocaleString("id-ID")}
              <span className="text-sm font-medium text-muted-foreground ml-1">pcs</span>
            </p>
          </div>
          {qty_total_po > 0 && (
            <Badge
              variant="outline"
              className="self-center text-xs tabular-nums font-semibold"
            >
              {((qty_today / qty_total_po) * 100).toFixed(1)}% hari ini
            </Badge>
          )}
        </div>

        {/* Mini Trend Chart */}
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `📅 ${label}`}
                      formatter={(value) => [
                        `${Number(value).toLocaleString("id-ID")} pcs`,
                        "Qty",
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="qty"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            Belum ada data tren
          </div>
        )}
      </CardContent>
    </Card>
  );
}
