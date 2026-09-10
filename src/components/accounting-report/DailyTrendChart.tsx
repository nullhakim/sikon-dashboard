import { useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AccountingDailyTrend } from "@/lib/types/accounting-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart as AreaChartIcon, BarChart2, TrendingUp } from "lucide-react";

interface DailyTrendChartProps {
  data: AccountingDailyTrend[];
  isLoading: boolean;
}

type ChartMode = "bar" | "area";

const chartConfig = {
  omset_amount: {
    label: "Omset",
    color: "var(--color-chart-1)",
  },
  cash_in: {
    label: "Cash-In",
    color: "var(--color-chart-2)",
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

/** Formats number to compact IDR, e.g. 5000000 → "5jt" */
function compactIDR(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return value.toString();
}

/**
 * Daily trend chart comparing Omset vs Cash-In per day.
 * Supports Bar and Area chart modes.
 */
export function DailyTrendChart({ data, isLoading }: DailyTrendChartProps) {
  const [mode, setMode] = useState<ChartMode>("bar");

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
              Tren Harian — Omset vs Cash-In
            </CardTitle>
            <CardDescription className="mt-0.5">
              Perbandingan omset dan uang masuk per hari dalam rentang waktu yang dipilih
            </CardDescription>
          </div>
          {/* Chart type toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1">
            <Button
              variant={mode === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setMode("bar")}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Bar
            </Button>
            <Button
              variant={mode === "area" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={() => setMode("area")}
            >
              <AreaChartIcon className="h-3.5 w-3.5" />
              Area
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-end gap-1 h-56">
              {Array.from({ length: 12 }).map((_, i) => (
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
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center">
              Belum ada data tren harian untuk periode ini.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {mode === "bar" ? (
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
                    width={44}
                    tickFormatter={(v) => compactIDR(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => `📅 ${label}`}
                        formatter={(value, name) => [
                          `Rp ${Number(value).toLocaleString("id-ID")}`,
                          name === "omset_amount" ? "Omset" : "Cash-In",
                        ]}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(value) => (value === "omset_amount" ? "Omset" : "Cash-In")}
                  />
                  <Bar
                    dataKey="omset_amount"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="cash_in"
                    fill="var(--color-chart-2)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
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
                    width={44}
                    tickFormatter={(v) => compactIDR(v)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => `📅 ${label}`}
                        formatter={(value, name) => [
                          `Rp ${Number(value).toLocaleString("id-ID")}`,
                          name === "omset_amount" ? "Omset" : "Cash-In",
                        ]}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(value) => (value === "omset_amount" ? "Omset" : "Cash-In")}
                  />
                  <Area
                    type="monotone"
                    dataKey="omset_amount"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#colorOmset)"
                    dot={chartData.length <= 14 ? { r: 3, fill: "var(--color-chart-1)" } : false}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cash_in"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2.5}
                    fill="url(#colorCashIn)"
                    dot={chartData.length <= 14 ? { r: 3, fill: "var(--color-chart-2)" } : false}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
