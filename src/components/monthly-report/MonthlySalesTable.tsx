import type { SalesPerformanceRow } from "@/lib/types/monthly-report";
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
import { Trophy, Users } from "lucide-react";
import { formatIDR } from "@/lib/format";

interface MonthlySalesTableProps {
  data: SalesPerformanceRow[];
  isLoading: boolean;
}

/**
 * Sales performance table for monthly report.
 * Shows each sales' total omset and total orders, with TOP badge for highest performer.
 */
export function MonthlySalesTable({ data, isLoading }: MonthlySalesTableProps) {
  // Sort by total_omset descending for display
  const sorted = [...data].sort((a, b) => b.total_omset - a.total_omset);

  const maxOmset = sorted.reduce((max, row) => Math.max(max, row.total_omset), 0);

  const totalOmset = sorted.reduce((sum, row) => sum + row.total_omset, 0);
  const totalOrders = sorted.reduce((sum, row) => sum + row.total_orders, 0);

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Kinerja Sales Bulanan
            </CardTitle>
            <CardDescription className="mt-0.5">
              Kontribusi omset dan jumlah order per sales bulan ini
            </CardDescription>
          </div>
          {!isLoading && data.length > 0 && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {data.length} sales
            </Badge>
          )}
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
                Nama Sales
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap py-3">
                Total Omset
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">
                Total Order
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-5">
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada data kinerja sales untuk bulan ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              sorted.map((row, idx) => {
                const isTopSales = maxOmset > 0 && row.total_omset === maxOmset;
                return (
                  <TableRow
                    key={row.sales_id}
                    className={
                      isTopSales
                        ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        : undefined
                    }
                  >
                    <TableCell className="pl-5 tabular-nums text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isTopSales && (
                          <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span>{row.sales_name}</span>
                        {isTopSales && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold">
                            TOP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${
                        isTopSales ? "text-amber-700 dark:text-amber-400" : ""
                      }`}
                    >
                      {formatIDR(row.total_omset)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums pr-5">
                      {row.total_orders.toLocaleString("id-ID")}
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
                  {formatIDR(totalOmset)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold pr-5">
                  {totalOrders.toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
