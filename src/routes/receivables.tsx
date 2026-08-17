import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReceivablesTable } from "@/components/ReceivablesTable";

export const Route = createFileRoute("/receivables")({
  head: () => ({
    meta: [
      { title: "Laporan Piutang — SIKOn ERP" },
      { name: "description", content: "Daftar tagihan pelanggan yang belum terbayar lunas." },
    ],
  }),
  component: ReceivablesPage,
});

function ReceivablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan Piutang</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Daftar tagihan pelanggan yang belum terbayar lunas untuk mempermudah proses penagihan.
        </p>
      </div>

      <Card className="border-border/60 transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Detail Piutang Pelanggan</CardTitle>
          <CardDescription>
            Daftar tagihan yang belum terbayar lunas, diurutkan berdasarkan tanggal atau sisa piutang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReceivablesTable />
        </CardContent>
      </Card>
    </div>
  );
}
