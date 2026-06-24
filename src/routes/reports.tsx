import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dashboardService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SIKOn ERP" },
      { name: "description", content: "View sales and receivables reports." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [salesStartDate, setSalesStartDate] = useState("");
  const [salesEndDate, setSalesEndDate] = useState("");

  const receivables = useQuery({
    queryKey: ["receivables-report"],
    queryFn: () => dashboardService.receivablesReport(),
  });

  const sales = useQuery({
    queryKey: ["sales-report", salesStartDate, salesEndDate],
    queryFn: () => dashboardService.salesReport({ start_date: salesStartDate, end_date: salesEndDate }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          View your sales and receivables data.
        </p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>View your daily sales revenue and orders.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={salesStartDate}
                  onChange={(e) => setSalesStartDate(e.target.value)}
                  className="w-auto"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={salesEndDate}
                  onChange={(e) => setSalesEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Orders</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Canceled</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  )}
                  {sales.data?.data?.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="text-right">{row.total_orders}</TableCell>
                      <TableCell className="text-right">{row.completed_orders}</TableCell>
                      <TableCell className="text-right">{row.canceled_orders}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(row.total_revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {!sales.isLoading && (!sales.data?.data || sales.data.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No data found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Receivables Report</CardTitle>
              <CardDescription>Track unpaid balances from customers.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.isLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  )}
                  {receivables.data?.data?.map((row: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row.order_number}</TableCell>
                      <TableCell>{formatDate(row.order_date)}</TableCell>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>{row.sales_name}</TableCell>
                      <TableCell className="capitalize">{row.order_status}</TableCell>
                      <TableCell className="text-right">{formatIDR(row.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatIDR(row.total_paid)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatIDR(row.remaining_bill)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!receivables.isLoading && (!receivables.data?.data || receivables.data.data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No receivables found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
