import type { ProductionTrendPoint } from "@/lib/types/production-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
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
import { TrendingUp } from "lucide-react";

interface ProductionTrendChartProps {
  data: ProductionTrendPoint[];
  isLoading: boolean;
}

const chartConfig = {
  qty: {
    label: "Qty Order",
    color: "var(--color-chart-1)",
  },
};

/** Formats YYYY-MM-DD → short day, e.g. "1", "15", "31" */
function shortDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.getDate().toString();
  } catch {
    return dateStr;
  }
}

/** Formats YYYY-MM-DD → full label, e.g. "15 Juli 2026" */
function fullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Area chart showing daily order quantity trends for one full month.
 * Uses recharts with shadcn ChartContainer for consistent theming.
 */
export function ProductionTrendChart({ data, isLoading }: ProductionTrendChartProps) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));

  const totalQty = sorted.reduce((sum, p) => sum + p.qty, 0);
  const avgQty = sorted.length > 0 ? Math.round(totalQty / sorted.length) : 0;
  const maxQty = sorted.reduce((max, p) => Math.max(max, p.qty), 0);

  const chartData = sorted.map((point) => ({
    ...point,
    label: shortDay(point.date),
    fullLabel: fullDate(point.date),
  }));

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tren Order Harian
            </CardTitle>
            <CardDescription className="mt-0.5">
              Grafik kuantitas pesanan harian selama satu bulan penuh
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {sorted.length > 0 && (
              <>
                <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                  Avg: {avgQty.toLocaleString("id-ID")} pcs/hari
                </Badge>
                <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                  Max: {maxQty.toLocaleString("id-ID")} pcs
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="prodTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                  width={36}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullLabel ? `📅 ${item.fullLabel}` : `📅 ${_label}`;
                      }}
                      formatter={(value) => [
                        `${Number(value).toLocaleString("id-ID")} pcs`,
                        "Qty Order",
                      ]}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="qty"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#prodTrendGradient)"
                  dot={{ r: 2, fill: "var(--color-chart-1)" }}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground rounded-lg border border-dashed border-border">
            Belum ada data tren untuk bulan ini
          </div>
        )}
      </CardContent>
    </Card>
  );
}
