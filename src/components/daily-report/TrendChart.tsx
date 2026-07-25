import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { TrendDataPoint } from "@/lib/types/daily-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart as AreaChartIcon, BarChart2, TrendingUp } from "lucide-react";

interface TrendChartProps {
  data: TrendDataPoint[];
  isLoading: boolean;
}

type ChartMode = "area" | "bar";

const chartConfig = {
  qty: {
    label: "Qty Order",
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
 * Production trend chart supporting Area and Bar modes.
 * Shows daily order qty from PO start date to today.
 */
export function TrendChart({ data, isLoading }: TrendChartProps) {
  const [mode, setMode] = useState<ChartMode>("area");

  const chartData = data.map((d) => ({
    ...d,
    label: shortDate(d.date),
  }));

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tren Produksi Harian
            </CardTitle>
            <CardDescription className="mt-0.5">
              Pertumbuhan order qty dari awal PO sampai hari ini
            </CardDescription>
          </div>
          {/* Chart type toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1">
            <Button
              variant={mode === "area" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setMode("area")}
            >
              <AreaChartIcon className="h-3.5 w-3.5" />
              Area
            </Button>
            <Button
              variant={mode === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setMode("bar")}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Bar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-end gap-1 h-48">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${30 + Math.random() * 70}%` }}
                />
              ))}
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AreaChartIcon className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center">
              Belum ada data tren untuk PO ini.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === "area" ? (
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0.02}
                      />
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
                    tickFormatter={(v) => v.toLocaleString("id-ID")}
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
                  <Area
                    type="monotone"
                    dataKey="qty"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#colorQty)"
                    dot={chartData.length <= 14 ? { r: 3, fill: "var(--color-chart-1)" } : false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    tickFormatter={(v) => v.toLocaleString("id-ID")}
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
                    maxBarSize={48}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
