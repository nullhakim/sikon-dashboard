import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accentClass?: string;
  trend?: "up" | "down" | "neutral";
  delta?: string;
  isLoading?: boolean;
}

/**
 * Generic metric card — reusable for any numeric KPI.
 * Supports trend indicators and delta percentages.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClass = "text-primary",
  trend,
  delta,
  isLoading = false,
}: StatCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-rose-500"
        : "text-muted-foreground";

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={`rounded-md p-1.5 bg-muted/60`}>
          <Icon className={`h-4 w-4 ${accentClass}`} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {hint && (
                <p className="text-xs text-muted-foreground">{hint}</p>
              )}
              {trend && delta && (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  {delta}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
