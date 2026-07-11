import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { AlertCircle, Wallet } from "lucide-react";

interface ReceivablesSummaryProps {
  totalOutstanding: number;
  activePOReceivables: number;
  isLoading: boolean;
}

interface ReceivableItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}

/** Single receivable metric row. */
function ReceivableItem({ icon, label, value, valueClass = "" }: ReceivableItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={`text-base font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

/**
 * Displays outstanding receivables summary: total + active PO receivables.
 */
export function ReceivablesSummary({
  totalOutstanding,
  activePOReceivables,
  isLoading,
}: ReceivablesSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ringkasan Piutang</CardTitle>
        <CardDescription>Total piutang yang masih outstanding.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-6 text-sm text-muted-foreground">Memuat data…</p>
        ) : (
          <div className="space-y-3">
            <ReceivableItem
              icon={<AlertCircle className="h-4 w-4 text-destructive" />}
              label="Total Piutang Outstanding"
              value={formatIDR(totalOutstanding)}
              valueClass="text-destructive"
            />
            <ReceivableItem
              icon={<Wallet className="h-4 w-4 text-amber-500" />}
              label="Piutang Active PO"
              value={formatIDR(activePOReceivables)}
              valueClass="text-amber-600 dark:text-amber-400"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
