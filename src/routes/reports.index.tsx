import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { ReceivablesTable } from "@/components/ReceivablesTable";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Reports — SIKOn ERP" },
      { name: "description", content: "View sales and receivables reports." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : "receivables",
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [salesStartDate, setSalesStartDate] = useState("");
  const [salesEndDate, setSalesEndDate] = useState("");

  const sales = useQuery({
    queryKey: ["sales-report", salesStartDate, salesEndDate],
    queryFn: () => dashboardService.salesReport({ start_date: salesStartDate, end_date: salesEndDate }),
  });

  const handleTabChange = (val: string) => {
    navigate({ search: { tab: val }, replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          View your sales and receivables data.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="receivables">Laporan Piutang</TabsTrigger>
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
              <CardTitle>Laporan Detail Piutang</CardTitle>
              <CardDescription>
                Daftar tagihan yang belum terbayar lunas, diurutkan dari sisa piutang terbesar.
                Gunakan data ini untuk penagihan ke pelanggan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceivablesTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
