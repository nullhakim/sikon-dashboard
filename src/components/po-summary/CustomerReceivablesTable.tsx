import type { POSummaryCustomerReceivable } from "@/lib/types/po-summary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIDR } from "@/lib/format";
import { AlertCircle, Users } from "lucide-react";

interface CustomerReceivablesTableProps {
  data: POSummaryCustomerReceivable[];
  isLoading: boolean;
}

/**
 * Customer-level receivables table for PO Summary/Closing Report.
 * Highlights customers who still have outstanding amounts.
 * Sorted by outstanding_amount descending.
 */
export function CustomerReceivablesTable({ data, isLoading }: CustomerReceivablesTableProps) {
  const sorted = [...data].sort((a, b) => b.outstanding_amount - a.outstanding_amount);

  const totalAmount = sorted.reduce((sum, row) => sum + row.total_amount, 0);
  const totalPaid = sorted.reduce((sum, row) => sum + row.total_paid, 0);
  const totalOutstanding = sorted.reduce((sum, row) => sum + row.outstanding_amount, 0);

  const hasOutstanding = sorted.some((r) => r.outstanding_amount > 0);

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              Daftar Piutang Customer
            </CardTitle>
            <CardDescription className="mt-0.5">
              Rincian piutang per customer pada PO ini — gunakan untuk penagihan
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && data.length > 0 && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {data.length} customer
              </Badge>
            )}
            {!isLoading && hasOutstanding && (
              <Badge className="shrink-0 text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800 font-semibold">
                {sorted.filter((r) => r.outstanding_amount > 0).length} belum lunas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold whitespace-nowrap pl-5 py-3 w-12">
                #
              </TableHead>
              <TableHead className="font-semibold whitespace-nowrap py-3">
                Nama Customer
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap py-3">
                Total Tagihan
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap py-3">
                Sudah Dibayar
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap py-3">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">
                Sisa Piutang
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-5">
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <span>Tidak ada data piutang customer untuk PO ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              sorted.map((row, idx) => {
                const hasDebt = row.outstanding_amount > 0;
                const isFullyPaid = row.outstanding_amount <= 0;
                return (
                  <TableRow
                    key={row.customer_name}
                    className={
                      hasDebt
                        ? "bg-red-50/40 dark:bg-red-900/5 hover:bg-red-50/60 dark:hover:bg-red-900/10"
                        : undefined
                    }
                  >
                    <TableCell className="pl-5 tabular-nums text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row.customer_name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIDR(row.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatIDR(row.total_paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFullyPaid ? (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold">
                          LUNAS
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800 font-semibold">
                          BELUM LUNAS
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums pr-5 ${
                        hasDebt ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {formatIDR(row.outstanding_amount)}
                    </TableCell>
                  </TableRow>
                );
              })}

            {/* Totals footer row */}
            {!isLoading && sorted.length > 0 && (
              <TableRow className="border-t-2 bg-muted/20 font-semibold hover:bg-muted/30">
                <TableCell className="pl-5" />
                <TableCell className="text-sm font-bold">TOTAL</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold">
                  {formatIDR(totalAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {formatIDR(totalPaid)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums text-sm font-bold text-red-700 dark:text-red-400 pr-5">
                  {formatIDR(totalOutstanding)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
