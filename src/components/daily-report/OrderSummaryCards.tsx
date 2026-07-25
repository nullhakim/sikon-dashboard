import type { OrderSummary } from "@/lib/types/daily-report";
import { StatCard } from "@/components/daily-report/StatCard";
import { ShoppingBag, BarChart3 } from "lucide-react";

interface OrderSummaryCardsProps {
  data: OrderSummary | null | undefined;
  isLoading: boolean;
}

/**
 * Two-card summary: today's order qty and cumulative PO total.
 * Accepts `data` as the `order_summary` sub-object from the API response.
 */
export function OrderSummaryCards({ data, isLoading }: OrderSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        label="Order Hari Ini"
        value={
          isLoading || !data
            ? "—"
            : `${(data.qty_today ?? 0).toLocaleString("id-ID")} pcs`
        }
        hint="Total qty order yang masuk hari ini"
        icon={ShoppingBag}
        accentClass="text-primary"
        isLoading={isLoading}
      />
      <StatCard
        label="Total Akumulasi PO"
        value={
          isLoading || !data
            ? "—"
            : `${(data.qty_total_po ?? 0).toLocaleString("id-ID")} pcs`
        }
        hint="Kumulatif qty sejak PO dibuka"
        icon={BarChart3}
        accentClass="text-violet-500"
        isLoading={isLoading}
      />
    </div>
  );
}
