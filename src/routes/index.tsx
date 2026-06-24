import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  CreditCard,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ordersService, paymentsService, dashboardService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SIKOn ERP" },
      { name: "description", content: "Overview of orders, payments, and customers." },
    ],
  }),
  component: Dashboard,
});

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

function Dashboard() {
  const orders = useQuery({
    queryKey: ["orders", { page: 1, limit: 5 }],
    queryFn: () => ordersService.list({ page: 1, limit: 5 }),
  });
  const payments = useQuery({
    queryKey: ["payments", { page: 1, limit: 5 }],
    queryFn: () => paymentsService.list({ page: 1, limit: 5 }),
  });
  const summary = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardService.summary(),
  });

  const totalOrders = summary.data?.data?.total_active_orders ?? 0;
  const totalRevenue = summary.data?.data?.total_revenue ?? 0;
  const totalReceivable = summary.data?.data?.total_receivable ?? 0;
  const totalCompleted = summary.data?.data?.total_completed_orders ?? 0;

  const stats = [
    {
      label: "Active Orders",
      value: totalOrders.toLocaleString("id-ID"),
      icon: ShoppingCart,
      hint: "Currently in progress",
    },
    {
      label: "Total Revenue",
      value: formatIDR(totalRevenue),
      icon: TrendingUp,
      hint: "Completed & paid orders",
    },
    {
      label: "Total Receivables",
      value: formatIDR(totalReceivable),
      icon: CreditCard,
      hint: "Unpaid remaining balances",
    },
    {
      label: "Completed Orders",
      value: totalCompleted.toLocaleString("id-ID"),
      icon: Users,
      hint: "Successfully delivered",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your konveksi operations.
          </p>
        </div>
        <Button asChild>
          <Link to="/orders">
            View all orders <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {orders.isError && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive py-6">
                      Failed to load orders
                    </TableCell>
                  </TableRow>
                )}
                {orders.data?.data?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {o.order_number ?? o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{o.customer?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.order_status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(o.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No orders yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.isLoading && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {payments.data?.data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{formatDate(p.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {p.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No payments yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
