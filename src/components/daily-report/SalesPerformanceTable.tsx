import type { SalesDetailItem } from "@/lib/types/daily-report";
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

interface SalesPerformanceTableProps {
  data: SalesDetailItem[];
  isLoading: boolean;
}

/**
 * Dynamic matrix table: Nama Sales | [Category cols...] | Total Qty
 * - Derives category columns from data at runtime
 * - Highlights top sales with a trophy badge
 */
export function SalesPerformanceTable({ data, isLoading }: SalesPerformanceTableProps) {
  // Derive unique category columns from all rows
  const categories = Array.from(
    new Set(data.flatMap((row) => Object.keys(row.categories ?? {})))
  ).sort();

  const colSpan = 2 + categories.length; // "Nama Sales" + categories + "Total Qty"

  // Find the top sales person by total qty
  const maxQty = data.reduce((max, row) => Math.max(max, row.total_qty ?? 0), 0);

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Sales Performance — Matrix Kategori
            </CardTitle>
            <CardDescription className="mt-0.5">
              Rincian qty per sales dan per kategori produk
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
              <TableHead className="font-semibold whitespace-nowrap pl-5 py-3">
                Nama Sales
              </TableHead>
              {categories.map((cat) => (
                <TableHead key={cat} className="text-center font-semibold whitespace-nowrap">
                  {cat}
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold pr-5 whitespace-nowrap">
                Total Qty
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-5">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j} className="text-center">
                      <Skeleton className="h-4 w-10 mx-auto" />
                    </TableCell>
                  ))}
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-14 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada data sales untuk tanggal ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, idx) => {
                const isTopSales = maxQty > 0 && row.total_qty === maxQty;
                return (
                  <TableRow
                    key={idx}
                    className={
                      isTopSales
                        ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium pl-5 whitespace-nowrap">
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
                    {categories.map((cat) => (
                      <TableCell key={cat} className="text-center tabular-nums">
                        {(row.categories?.[cat] ?? 0).toLocaleString("id-ID")}
                      </TableCell>
                    ))}
                    <TableCell
                      className={`text-right font-semibold tabular-nums pr-5 ${
                        isTopSales ? "text-amber-700 dark:text-amber-400" : ""
                      }`}
                    >
                      {(row.total_qty ?? 0).toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                );
              })}

            {/* Totals footer row */}
            {!isLoading && data.length > 0 && (
              <TableRow className="border-t-2 bg-muted/20 font-semibold hover:bg-muted/30">
                <TableCell className="pl-5 text-sm font-bold">TOTAL</TableCell>
                {categories.map((cat) => (
                  <TableCell key={cat} className="text-center tabular-nums text-sm font-bold">
                    {data
                      .reduce((sum, row) => sum + (row.categories?.[cat] ?? 0), 0)
                      .toLocaleString("id-ID")}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums text-sm font-bold pr-5">
                  {data
                    .reduce((sum, row) => sum + (row.total_qty ?? 0), 0)
                    .toLocaleString("id-ID")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
