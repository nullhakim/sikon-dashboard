import type { MonthlySummary } from "@/lib/types/monthly-report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  ShoppingCart,
  Package,
} from "lucide-react";

interface SummaryCardsProps {
  data: MonthlySummary | null | undefined;
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
 * Grid of 5 summary metric cards for monthly report.
 * Displays: Omset, Cash-In, Piutang, Total Order, Total Qty.
 */
export function SummaryCards({ data, isLoading }: SummaryCardsProps) {
  const d = data ?? {
    total_omset: 0,
    total_cash_in: 0,
    total_receivable: 0,
    total_order_count: 0,
    total_item_qty: 0,
  };

  const metrics: MetricCardProps[] = [
    {
      label: "Total Omset",
      value: formatIDR(d.total_omset),
      icon: <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      valueColor: "text-blue-700 dark:text-blue-300",
      description: "Order yang sudah approved",
    },
    {
      label: "Cash-In (Uang Masuk)",
      value: formatIDR(d.total_cash_in),
      icon: <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      description: "Pembayaran aktual yang diterima",
    },
    {
      label: "Piutang Baru",
      value: formatIDR(d.total_receivable),
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      valueColor: "text-amber-700 dark:text-amber-300",
      description: "Sisa tagihan belum terbayar",
    },
    {
      label: "Total Order",
      value: d.total_order_count.toLocaleString("id-ID"),
      icon: <ShoppingCart className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      valueColor: "text-violet-700 dark:text-violet-300",
      description: "Jumlah order bulan ini",
    },
    {
      label: "Total Qty Item",
      value: `${d.total_item_qty.toLocaleString("id-ID")} pcs`,
      icon: <Package className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
      iconBg: "bg-rose-100 dark:bg-rose-900/40",
      valueColor: "text-rose-700 dark:text-rose-300",
      description: "Kuantitas item terproduksi",
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
