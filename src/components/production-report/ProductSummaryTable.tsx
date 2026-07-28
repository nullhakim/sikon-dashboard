import type { ProductSummaryRow } from "@/lib/types/production-report";
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
import { Package } from "lucide-react";

interface ProductSummaryTableProps {
  data: ProductSummaryRow[];
  isLoading: boolean;
}

/**
 * Product category summary table for production report.
 * Shows qty per product category.
 */
export function ProductSummaryTable({ data, isLoading }: ProductSummaryTableProps) {
  const sorted = [...data].sort((a, b) => b.total_qty - a.total_qty);
  const totalQty = sorted.reduce((sum, row) => sum + row.total_qty, 0);

  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Ringkasan Produk per Kategori
            </CardTitle>
            <CardDescription className="mt-0.5">
              Total qty berdasarkan kategori produk di edisi ini
            </CardDescription>
          </div>
          {!isLoading && data.length > 0 && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {data.length} kategori
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
                Kategori Produk
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">
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
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-14 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada data produk untuk edisi ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              sorted.map((row, idx) => (
                <TableRow key={row.category_name}>
                  <TableCell className="pl-5 tabular-nums text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.category_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium pr-5">
                    {row.total_qty.toLocaleString("id-ID")} pcs
                  </TableCell>
                </TableRow>
              ))}

            {/* Totals footer row */}
            {!isLoading && sorted.length > 0 && (
              <TableRow className="border-t-2 bg-muted/20 font-semibold hover:bg-muted/30">
                <TableCell className="pl-5" />
                <TableCell className="text-sm font-bold">TOTAL</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold pr-5">
                  {totalQty.toLocaleString("id-ID")} pcs
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
