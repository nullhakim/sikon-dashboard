import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ordersService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — SIKOn ERP" },
      { name: "description", content: "Manage konveksi orders: create, view, update status." },
    ],
  }),
  component: OrdersPage,
});

const statusList: OrderStatus[] = ["pending", "production", "completed", "canceled"];

const statusVariant: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  production: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  canceled: "bg-rose-100 text-rose-800 border-rose-200",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status ?? "—"}
    </span>
  );
}

function OrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", { page, limit }],
    queryFn: () => ordersService.list({ page, limit }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersService.delete(id),
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track every order from intake through delivery.
          </p>
        </div>
        <Button asChild>
          <Link to="/orders/new">
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading orders…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive py-8">
                    {(error as Error)?.message ?? "Failed to load orders"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">
                    {o.invoice_number ?? o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {o.customer?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(o.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          statusMut.mutate({ id: o.id, status: v as OrderStatus })
                        }
                      >
                        <SelectTrigger className="h-7 w-[120px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusList.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatIDR(o.total)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatIDR(o.paid ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this order?")) deleteMut.mutate(o.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
