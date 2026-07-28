import type { ActiveBatchPO } from "@/lib/types/production-report";
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
import { Layers } from "lucide-react";

interface ActiveBatchPOTableProps {
  data: ActiveBatchPO[];
  isLoading: boolean;
}

/** Status badge color mapping */
function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "closed":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    case "draft":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Table of active Batch POs for a production edition.
 */
export function ActiveBatchPOTable({ data, isLoading }: ActiveBatchPOTableProps) {
  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Daftar Batch PO Aktif
            </CardTitle>
            <CardDescription className="mt-0.5">
              Purchase Order yang berjalan di edisi ini
            </CardDescription>
          </div>
          {!isLoading && data.length > 0 && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {data.length} PO
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
                Nama PO
              </TableHead>
              <TableHead className="font-semibold whitespace-nowrap py-3 text-center">
                Status
              </TableHead>
              <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">
                Kuota
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-5">
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Skeleton className="h-4 w-14 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-8 w-8 text-muted-foreground/30" />
                    <span>Belum ada Batch PO aktif pada edisi ini.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5 tabular-nums text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`text-[10px] px-2 py-0.5 font-semibold capitalize ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium pr-5">
                    {row.quota.toLocaleString("id-ID")} pcs
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
