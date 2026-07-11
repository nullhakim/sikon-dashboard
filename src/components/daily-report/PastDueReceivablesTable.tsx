import type { PastDueReceivable } from "@/lib/types/daily-report";
import { formatIDR } from "@/lib/format";
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

interface PastDueReceivablesTableProps {
  data: PastDueReceivable[];
  isLoading: boolean;
}

/**
 * Renders the list of past-due receivables in a tabular format.
 * Columns: Nama Sales, Kategori Produk, Nama Customer, Sisa Tagihan.
 */
export function PastDueReceivablesTable({ data, isLoading }: PastDueReceivablesTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Piutang Jatuh Tempo</CardTitle>
          <CardDescription>Tagihan yang belum dibayar dan sudah melewati batas waktu.</CardDescription>
        </div>
        {!isLoading && data.length > 0 && (
          <Badge variant="destructive" className="shrink-0 mt-0.5">
            {data.length} item
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Sales</TableHead>
              <TableHead>Kategori Produk</TableHead>
              <TableHead>Nama Customer</TableHead>
              <TableHead className="text-right">Sisa Tagihan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Memuat data…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Tidak ada piutang jatuh tempo. 🎉
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              data.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.sales_name}</TableCell>
                  <TableCell>{row.product_category}</TableCell>
                  <TableCell>{row.customer_name}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-destructive">
                    {formatIDR(row.unpaid_balance)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
