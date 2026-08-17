import type { AccountingSummary } from "@/lib/types/accounting-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  Activity,
  ArrowRightLeft,
  PieChart,
  ShoppingCart,
  Package,
  AlertCircle,
  TrendingDown,
} from "lucide-react";

interface SummaryCardsProps {
  data: AccountingSummary | null | undefined;
  isLoading: boolean;
}

interface HeroCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  borderColor: string;
  valueColor: string;
  description: string;
  isLoading?: boolean;
}

function HeroCard({
  label,
  value,
  icon,
  iconBg,
  borderColor,
  valueColor,
  description,
  isLoading = false,
}: HeroCardProps) {
  return (
    <Card className={`border-t-4 ${borderColor} border-x border-b border-border/60 transition-all hover:shadow-md`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            {isLoading ? (
              <div className="space-y-2 mt-2">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <>
                <p className={`text-2xl font-bold tabular-nums leading-tight mt-1 ${valueColor}`}>
                  {value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {description}
                </p>
              </>
            )}
          </div>
          <div className={`rounded-xl p-2.5 shrink-0 ${iconBg}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Refactored SummaryCards for Accounting Report:
 * 1. 4 Top Hero Cards (Total Omset, Cash-In, Laba Bersih, Net Cashflow)
 * 2. P&L & Cash Breakdown (Compact Horizontal Summary Card)
 * 3. Operational Information Badges (Total Order & Total Qty)
 */
export function SummaryCards({ data, isLoading }: SummaryCardsProps) {
  const d = data ?? {
    total_omset: 0,
    total_cash_in: 0,
    total_receivable: 0,
    total_order_count: 0,
    total_item_qty: 0,
    total_hpp: 0,
    gross_profit: 0,
    total_opex: 0,
    net_profit: 0,
    net_cashflow: 0,
  };

  const heroCards: HeroCardProps[] = [
    {
      label: "Total Omset",
      value: formatIDR(d.total_omset),
      icon: <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      borderColor: "border-t-blue-500",
      valueColor: "text-blue-600 dark:text-blue-400",
      description: "Order yang sudah approved",
    },
    {
      label: "Cash-In / Uang Masuk",
      value: formatIDR(d.total_cash_in),
      icon: <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      borderColor: "border-t-emerald-500",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      description: "Pembayaran terverifikasi",
    },
    {
      label: "Laba Bersih (Net Profit)",
      value: formatIDR(d.net_profit),
      icon: <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      borderColor: "border-t-purple-500",
      valueColor: "text-purple-600 dark:text-purple-400",
      description: "Laba Kotor - OPEX",
    },
    {
      label: "Net Cashflow",
      value: formatIDR(d.net_cashflow),
      icon: <ArrowRightLeft className="h-5 w-5 text-teal-600 dark:text-teal-400" />,
      iconBg: "bg-teal-100 dark:bg-teal-900/40",
      borderColor: "border-t-teal-500",
      valueColor: "text-teal-600 dark:text-teal-400",
      description: "Cash In - Total Pengeluaran",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── 1. Top Hero Metrics (4-Column Grid) ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {heroCards.map((hero) => (
          <HeroCard key={hero.label} {...hero} isLoading={isLoading} />
        ))}
      </div>

      {/* ── 2. Compact P&L Breakdown Card & Operational Badges ── */}
      <Card className="border-border/60">
        <CardHeader className="py-3 px-5 border-b border-border/40 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Rincian P&L & Piutang (Cost Breakdown)
              </CardTitle>
            </div>
            
            {/* Operational Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-background/80 font-medium gap-1.5 py-1 px-2.5">
                <ShoppingCart className="h-3.5 w-3.5 text-violet-500" />
                <span>Total Order:</span>
                <strong className="text-foreground">
                  {isLoading ? "..." : d.total_order_count.toLocaleString("id-ID")}
                </strong>
              </Badge>
              <Badge variant="outline" className="text-xs bg-background/80 font-medium gap-1.5 py-1 px-2.5">
                <Package className="h-3.5 w-3.5 text-rose-500" />
                <span>Total Item:</span>
                <strong className="text-foreground">
                  {isLoading ? "..." : `${d.total_item_qty.toLocaleString("id-ID")} pcs`}
                </strong>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-4 px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {/* HPP */}
            <div className="pt-2 sm:pt-0 sm:px-2 first:px-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                <span>Total HPP</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {formatIDR(d.total_hpp)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">Bahan & Maklon</p>
            </div>

            {/* Laba Kotor */}
            <div className="pt-2 sm:pt-0 sm:px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-teal-500" />
                <span>Laba Kotor</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {formatIDR(d.gross_profit)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">Omset - HPP</p>
            </div>

            {/* OPEX */}
            <div className="pt-2 sm:pt-0 sm:px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                <span>Total OPEX</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {formatIDR(d.total_opex)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">Biaya Operasional</p>
            </div>

            {/* Piutang Baru */}
            <div className="pt-2 sm:pt-0 sm:px-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                <span>Piutang Baru</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <p className="text-base font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatIDR(d.total_receivable)}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">Belum Terbayar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
