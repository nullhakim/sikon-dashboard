import type { ProductionSalesRow } from "@/lib/types/production-report";
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

interface ProductionSalesTableProps {
  data: ProductionSalesRow[];
  isLoading: boolean;
}

/**
 * Sales summary table for production report with dynamic category columns.
 * Shows each sales' qty per product category, total qty, and total revenue.
 * TOP badge for highest performer by revenue.
 */
export function ProductionSalesTable({ data, isLoading }: ProductionSalesTableProps) {
  // Collect all unique category names across all sales for dynamic columns
  const categorySet = new Set<string>();
  for (const row of data) {
    if (row.categories) {
      for (const cat of Object.keys(row.categories)) {
        categorySet.add(cat);
      }
    }
  }
  const categories = Array.from(categorySet).sort();
  const hasCategories = categories.length > 0;

  const sorted = [...data].sort((a, b) => b.total_revenue - a.total_revenue);

  const maxRevenue = sorted.reduce((max, row) => Math.max(max, row.total_revenue), 0);

  const totalQty = sorted.reduce((sum, row) => sum + row.total_qty, 0);
  const totalRevenue = sorted.reduce((sum, row) => sum + row.total_revenue, 0);

  // Column totals for categories
  const categoryTotals: Record<string, number> = {};
  for (const cat of categories) {
    categoryTotals[cat] = sorted.reduce(
      (sum, row) => sum + (row.categories?.[cat] ?? 0),
      0,
    );
  }

  const colSpan = 2 + (hasCategories ? categories.length : 0) + 2; // # + name + cats + qty + revenue

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Kinerja Sales — Produksi
            </CardTitle>
            <CardDescription className="mt-0.5">
              Kontribusi qty dan revenue per sales di edisi ini
              {hasCategories && " — dengan rincian per kategori"}
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
              {hasCategories &&
                categories.map((cat) => (
                  <TableHead
                    key={cat}
                    className="text-right font-semibold whitespace-nowrap py-3"
                  >
                    {cat}
                  </TableHead>
                ))}
              <TableHead className="text-right font-semibold whitespace-nowrap py-3">
                Total Qty
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">
                Total Revenue
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
                  {hasCategories &&
                    Array.from({ length: Math.min(categories.length, 3) }).map((_, j) => (
                      <TableCell key={j} className="text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </TableCell>
                    ))}
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-14 ml-auto" />
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
                  colSpan={colSpan}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada data kinerja sales untuk edisi ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              sorted.map((row, idx) => {
                const isTop = maxRevenue > 0 && row.total_revenue === maxRevenue;
                return (
                  <TableRow
                    key={row.sales_name}
                    className={
                      isTop
                        ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        : undefined
                    }
                  >
                    <TableCell className="pl-5 tabular-nums text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isTop && (
                          <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span>{row.sales_name}</span>
                        {isTop && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold">
                            TOP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {hasCategories &&
                      categories.map((cat) => (
                        <TableCell
                          key={cat}
                          className="text-right tabular-nums"
                        >
                          {row.categories?.[cat]
                            ? row.categories[cat].toLocaleString("id-ID")
                            : "—"}
                        </TableCell>
                      ))}
                    <TableCell className="text-right tabular-nums font-medium">
                      {row.total_qty.toLocaleString("id-ID")} pcs
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums pr-5 ${
                        isTop ? "text-amber-700 dark:text-amber-400" : ""
                      }`}
                    >
                      {formatIDR(row.total_revenue)}
                    </TableCell>
                  </TableRow>
                );
              })}

            {/* Totals footer row */}
            {!isLoading && sorted.length > 0 && (
              <TableRow className="border-t-2 bg-muted/20 font-semibold hover:bg-muted/30">
                <TableCell className="pl-5" />
                <TableCell className="text-sm font-bold">TOTAL</TableCell>
                {hasCategories &&
                  categories.map((cat) => (
                    <TableCell
                      key={cat}
                      className="text-right tabular-nums text-sm font-bold"
                    >
                      {(categoryTotals[cat] ?? 0).toLocaleString("id-ID")}
                    </TableCell>
                  ))}
                <TableCell className="text-right tabular-nums text-sm font-bold">
                  {totalQty.toLocaleString("id-ID")} pcs
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold pr-5">
                  {formatIDR(totalRevenue)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
