import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  CreditCard,
  Users,
  TrendingUp,
  ArrowRight,
  Package,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  production: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  ready: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  canceled: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

function StatusBadge({ status }: { status: string }) {
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}
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
      value: `${totalOrders.toLocaleString("id-ID")} orders`,
      icon: ShoppingCart,
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      iconColor: "text-violet-600 dark:text-violet-400",
      valueColor: "text-violet-700 dark:text-violet-300",
      hint: "Currently in progress",
    },
    {
      label: "Total Revenue",
      value: formatIDR(totalRevenue),
      icon: TrendingUp,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-700 dark:text-emerald-300",
      hint: "Completed & paid orders",
    },
    {
      label: "Total Receivables",
      value: formatIDR(totalReceivable),
      icon: CreditCard,
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
      hint: "Unpaid remaining balances",
      to: "/reports",
      search: { tab: "receivables" },
    },
    {
      label: "Completed Orders",
      value: `${totalCompleted.toLocaleString("id-ID")} orders`,
      icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-700 dark:text-blue-300",
      hint: "Successfully delivered",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your konveksi operations.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/orders" search={{ page: 1, search: "", order_status: "", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}>
            View all orders <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const cardContent = (
            <Card className={`border-border/60 transition-shadow hover:shadow-md h-full ${s.to ? 'hover:border-primary/50 cursor-pointer' : ''}`}>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start gap-3.5">
                  <div className={`rounded-xl p-2.5 shrink-0 ${s.iconBg}`}>
                    <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {summary.isLoading ? (
                      <div className="space-y-2 pt-1">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">{s.label}</p>
                        <p className={`text-xl font-bold tabular-nums leading-tight ${s.valueColor}`}>
                          {s.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          if (s.to) {
            return (
              <Link key={s.label} to={s.to as any} search={s.search as any} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                {cardContent}
              </Link>
            );
          }
          return <div key={s.label}>{cardContent}</div>;
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Table */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Recent Orders
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Latest created orders across all POs
                </CardDescription>
              </div>
              {!orders.isLoading && orders.data?.data && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {orders.data.data.length} orders
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap pl-5 py-3">Invoice</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3">Customer</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3 text-center">Status</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {orders.isError && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive py-12">
                      Failed to load orders
                    </TableCell>
                  </TableRow>
                )}
                {!orders.isLoading && !orders.isError && orders.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                        <span>No orders yet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!orders.isLoading && orders.data?.data?.map((o) => (
                  <TableRow key={o.id} className="group hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs pl-5 text-muted-foreground">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="hover:text-primary hover:underline underline-offset-2 transition-colors">
                        {o.order_number ?? o.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{o.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={o.order_status} />
                    </TableCell>
                    <TableCell className="text-right font-medium pr-5 tabular-nums">
                      {formatIDR(o.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card className="border-border/60 transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Recent Payments
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Latest recorded payment transactions
                </CardDescription>
              </div>
              {!payments.isLoading && payments.data?.data && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {payments.data.data.length} payments
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold whitespace-nowrap pl-5 py-3">Date</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap py-3">Type</TableHead>
                  <TableHead className="text-right font-semibold whitespace-nowrap pr-5 py-3">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-5"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell className="pr-5"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                {payments.isError && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-destructive py-12">
                      Failed to load payments
                    </TableCell>
                  </TableRow>
                )}
                {!payments.isLoading && !payments.isError && payments.data?.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="h-8 w-8 text-muted-foreground/30" />
                        <span>No payments yet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!payments.isLoading && payments.data?.data?.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-xs pl-5 whitespace-nowrap text-muted-foreground">
                      {formatDate(p.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px] font-semibold px-2 py-0.5">
                        {p.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium pr-5 tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatIDR(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
