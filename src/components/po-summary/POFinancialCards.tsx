import type { POSummaryData } from "@/lib/types/po-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  AlertCircle,
  Target,
  ShoppingCart,
  PackageMinus,
} from "lucide-react";

interface POFinancialCardsProps {
  data: POSummaryData | null | undefined;
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
  highlight?: boolean;
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  valueColor = "text-foreground",
  description,
  isLoading = false,
  highlight = false,
}: MetricCardProps) {
  return (
    <Card
      className={`border-border/60 transition-shadow hover:shadow-md ${
        highlight
          ? "ring-2 ring-emerald-200 dark:ring-emerald-800 border-emerald-200 dark:border-emerald-800"
          : ""
      }`}
    >
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
 * Grid of summary metric cards for PO Summary/Closing Report.
 * Top row: Revenue → HPP → Net Profit (highlighted).
 * Bottom row: Quota, Qty Ordered, Remaining, Total Paid, Outstanding.
 */
export function POFinancialCards({ data, isLoading }: POFinancialCardsProps) {
  const d = data ?? {} as POSummaryData;
  const total_revenue = d.total_revenue ?? 0;
  const total_paid = d.total_paid ?? 0;
  const total_outstanding = d.total_outstanding ?? 0;
  const total_hpp = d.total_hpp ?? 0;
  const net_profit = d.net_profit ?? 0;
  const total_quota = d.total_quota ?? 0;
  const total_qty_ordered = d.total_qty_ordered ?? 0;
  const remaining_quota = d.remaining_quota ?? 0;

  const financialMetrics: MetricCardProps[] = [
    {
      label: "Total Revenue",
      value: formatIDR(total_revenue),
      icon: <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      valueColor: "text-blue-700 dark:text-blue-300",
      description: "Pendapatan total PO ini",
    },
    {
      label: "Total HPP",
      value: formatIDR(total_hpp),
      icon: <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-100 dark:bg-red-900/40",
      valueColor: "text-red-700 dark:text-red-300",
      description: "Pengeluaran bahan baku / PO",
    },
    {
      label: "Net Profit (Laba Bersih)",
      value: formatIDR(net_profit),
      icon: <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      description: "Revenue − HPP",
      highlight: true,
    },
  ];

  const quotaMetrics: MetricCardProps[] = [
    {
      label: "Total Kuota",
      value: `${total_quota.toLocaleString("id-ID")} pcs`,
      icon: <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
      valueColor: "text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Qty Ordered",
      value: `${total_qty_ordered.toLocaleString("id-ID")} pcs`,
      icon: <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      valueColor: "text-violet-700 dark:text-violet-300",
    },
    {
      label: "Sisa Kuota",
      value: `${remaining_quota.toLocaleString("id-ID")} pcs`,
      icon: <PackageMinus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />,
      iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
      valueColor: "text-cyan-700 dark:text-cyan-300",
    },
    {
      label: "Total Paid",
      value: formatIDR(total_paid),
      icon: <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      valueColor: "text-teal-700 dark:text-teal-300",
    },
    {
      label: "Total Outstanding",
      value: formatIDR(total_outstanding),
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      valueColor: "text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Financial headline: Revenue → HPP → Net Profit */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {financialMetrics.map((m) => (
          <MetricCard key={m.label} {...m} isLoading={isLoading} />
        ))}
      </div>
      {/* Operational metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {quotaMetrics.map((m) => (
          <MetricCard key={m.label} {...m} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
