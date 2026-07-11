import type { SalesPerformanceItem } from "@/lib/types/daily-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SalesPerformanceTableProps {
  data: SalesPerformanceItem[];
  isLoading: boolean;
}

/**
 * Renders the sales performance breakdown in a tabular format.
 * Shows: Sales Name, Product Category, and Total Qty.
 */
export function SalesPerformanceTable({ data, isLoading }: SalesPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales Performance Hari Ini</CardTitle>
        <CardDescription>Rincian penjualan per sales dan kategori produk.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Sales</TableHead>
              <TableHead>Kategori Produk</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Memuat data…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Belum ada data penjualan untuk tanggal ini.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.sales_name}</TableCell>
                  <TableCell>{row.product_category}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.total_qty}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
