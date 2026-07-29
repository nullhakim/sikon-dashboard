import type { ProductionReportData } from "@/lib/types/production-report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import {
  Target,
  ShoppingCart,
  PackageMinus,
  TrendingUp,
  Wallet,
  AlertCircle,
  TrendingDown,
  Activity,
} from "lucide-react";

interface ProductionSummaryCardsProps {
  data: ProductionReportData | null | undefined;
  isLoading: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  description?: string;
  isLoading?: boolean;
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  valueColor = "text-foreground",
  description,
  isLoading = false,
}: MetricCardProps) {
  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start gap-3.5">
          <div className={`rounded-xl p-2.5 shrink-0 ${iconBg}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                <p className={`text-xl font-bold tabular-nums leading-tight ${valueColor}`}>
                  {value}
                </p>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of 6 summary metric cards for production report.
 * Displays: Total Kuota, Qty Ordered, Sisa Kuota, Total Revenue, Total Paid, Total Outstanding.
 */
export function ProductionSummaryCards({ data, isLoading }: ProductionSummaryCardsProps) {
  const d = data ?? {
    total_quota: 0,
    total_qty_ordered: 0,
    remaining_quota: 0,
    total_revenue: 0,
    total_paid: 0,
    total_outstanding: 0,
    total_hpp: 0,
    net_profit: 0,
  };

  const metrics: MetricCardProps[] = [
    {
      label: "Total Kuota",
      value: `${d.total_quota.toLocaleString("id-ID")} pcs`,
      icon: <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      valueColor: "text-blue-700 dark:text-blue-300",
      description: "Kuota edisi PO ini",
    },
    {
      label: "Qty Ordered",
      value: `${d.total_qty_ordered.toLocaleString("id-ID")} pcs`,
      icon: <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      valueColor: "text-violet-700 dark:text-violet-300",
      description: "Total qty yang sudah di-order",
    },
    {
      label: "Sisa Kuota",
      value: `${d.remaining_quota.toLocaleString("id-ID")} pcs`,
      icon: <PackageMinus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      valueColor: "text-cyan-700 dark:text-cyan-300",
      description: "Kuota yang masih tersedia",
    },
    {
      label: "Total Revenue",
      value: formatIDR(d.total_revenue),
      icon: <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      description: "Pendapatan total edisi ini",
    },
    {
      label: "Total Paid",
      value: formatIDR(d.total_paid),
      icon: <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      valueColor: "text-teal-700 dark:text-teal-300",
      description: "Pembayaran yang sudah diterima",
    },
    {
      label: "Total Outstanding",
      value: formatIDR(d.total_outstanding),
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      valueColor: "text-amber-700 dark:text-amber-300",
      description: "Sisa piutang belum terbayar",
    },
    {
      label: "Total HPP",
      value: formatIDR(d.total_hpp),
      icon: <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-100 dark:bg-red-900/40",
      valueColor: "text-red-700 dark:text-red-300",
      description: "Total pengeluaran edisi ini",
    },
    {
      label: "Net Profit",
      value: formatIDR(d.net_profit),
      icon: <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      valueColor: "text-indigo-700 dark:text-indigo-300",
      description: "Total Revenue - Total HPP",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} isLoading={isLoading} />
      ))}
    </div>
  );
}
