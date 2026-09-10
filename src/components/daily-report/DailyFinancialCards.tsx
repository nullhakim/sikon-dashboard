import type { DailyReportFinancialSummary } from "@/lib/types/daily-report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  Clock,
  BarChart3,
} from "lucide-react";

interface DailyFinancialCardsProps {
  data: DailyReportFinancialSummary | null | undefined;
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
 * Grid of financial summary metric cards for daily report.
 * Displays: Revenue, Paid, Active PO Outstanding, Previous PO Outstanding, Total Outstanding.
 */
export function DailyFinancialCards({ data, isLoading }: DailyFinancialCardsProps) {
  const d = data ?? {} as DailyReportFinancialSummary;
  const total_revenue = d.total_revenue ?? 0;
  const total_paid = d.total_paid ?? 0;
  const active_po_outstanding = d.active_po_outstanding ?? 0;
  const previous_po_outstanding = d.previous_po_outstanding ?? 0;
  const total_outstanding = d.total_outstanding ?? 0;

  const metrics: MetricCardProps[] = [
    {
      label: "Total Omset Hari Ini",
      value: formatIDR(total_revenue),
      icon: <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      valueColor: "text-blue-700 dark:text-blue-300",
      description: "Revenue order approved hari ini",
    },
    {
      label: "Uang Masuk (Paid)",
      value: formatIDR(total_paid),
      icon: <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      description: "Pembayaran yang sudah diterima",
    },
    {
      label: "Piutang PO Aktif",
      value: formatIDR(active_po_outstanding),
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      valueColor: "text-amber-700 dark:text-amber-300",
      description: "Piutang di PO yang sedang berjalan",
    },
    {
      label: "Piutang PO Lama",
      value: formatIDR(previous_po_outstanding),
      icon: <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      valueColor: "text-orange-700 dark:text-orange-300",
      description: "Piutang dari PO sebelumnya",
    },
    {
      label: "Total Outstanding",
      value: formatIDR(total_outstanding),
      icon: <BarChart3 className="h-4 w-4 text-red-600 dark:text-red-400" />,
      iconBg: "bg-red-100 dark:bg-red-900/40",
      valueColor: "text-red-700 dark:text-red-300",
      description: "Total seluruh piutang",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} isLoading={isLoading} />
      ))}
    </div>
  );
}
