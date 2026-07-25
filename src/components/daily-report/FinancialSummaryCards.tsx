import type { FinancialSummary } from "@/lib/types/daily-report";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  ClipboardList,
  BadgeDollarSign,
} from "lucide-react";

interface FinancialSummaryCardsProps {
  data: FinancialSummary | null | undefined;
  isLoading: boolean;
}

interface FinMetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
  description?: string;
  isLoading?: boolean;
}

function FinMetricCard({
  label,
  value,
  icon,
  iconBg,
  valueColor = "text-foreground",
  description,
  isLoading = false,
}: FinMetricCardProps) {
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
 * Grid of 5 financial metric cards.
 * Accepts `data` as the `financial_summary` sub-object from the API response.
 */
export function FinancialSummaryCards({ data, isLoading }: FinancialSummaryCardsProps) {
  const d = data ?? {
    total_revenue: 0,
    total_paid: 0,
    active_po_outstanding: 0,
    previous_po_outstanding: 0,
    total_outstanding: 0,
  };

  const metrics: FinMetricCardProps[] = [
    {
      label: "Total Omset / Tagihan PO Aktif",
      value: formatIDR(d.total_revenue),
      icon: <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      valueColor: "text-blue-700 dark:text-blue-300",
      description: "Akumulasi tagihan dari PO aktif",
    },
    {
      label: "Total Uang Masuk / DP",
      value: formatIDR(d.total_paid),
      icon: <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      description: "Pembayaran yang sudah diterima",
    },
    {
      label: "Sisa Tagihan / Piutang PO Aktif",
      value: formatIDR(d.active_po_outstanding),
      icon: <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      valueColor: "text-amber-700 dark:text-amber-300",
      description: "Belum dibayar dari PO ini",
    },
    {
      label: "Sisa Piutang PO Sebelumnya",
      value: formatIDR(d.previous_po_outstanding),
      icon: <ClipboardList className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
      iconBg: "bg-orange-100 dark:bg-orange-900/40",
      valueColor: "text-orange-700 dark:text-orange-300",
      description: "Piutang dari PO yang telah ditutup",
    },
    {
      label: "Total Keseluruhan Piutang",
      value: formatIDR(d.total_outstanding),
      icon: <BadgeDollarSign className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
      iconBg: "bg-rose-100 dark:bg-rose-900/40",
      valueColor: "text-rose-700 dark:text-rose-300",
      description: "Gabungan semua piutang aktif & lama",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((m) => (
        <FinMetricCard key={m.label} {...m} isLoading={isLoading} />
      ))}
    </div>
  );
}
