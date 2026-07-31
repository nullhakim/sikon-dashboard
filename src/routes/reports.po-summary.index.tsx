import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileBarChart, Layers, ArrowRight, Loader2 } from "lucide-react";

import { batchPosService } from "@/lib/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// ─── Route Definition ────────────────────────────────────────────────────────

export const Route = createFileRoute("/reports/po-summary/")({
  head: () => ({
    meta: [
      { title: "PO Summary — Pilih PO — SIKOn ERP" },
      {
        name: "description",
        content: "Pilih Batch PO untuk melihat rekapitulasi & laporan closing.",
      },
    ],
  }),
  component: POSummarySelector,
});

// ─── Main Component ───────────────────────────────────────────────────────────

function POSummarySelector() {
  const navigate = useNavigate();
  const [selectedPoId, setSelectedPoId] = useState<string>("");

  // Fetch all POs (paginated, limit high enough to get all)
  const { data, isLoading } = useQuery({
    queryKey: ["batch-pos-list-all"],
    queryFn: () => batchPosService.list({ page: 1, limit: 100 }),
  });

  const poList = data?.data ?? [];

  const handleNavigate = () => {
    if (selectedPoId) {
      navigate({ to: "/reports/po-summary/$poId", params: { poId: selectedPoId } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PO Summary Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Rekapitulasi PO — Revenue, HPP, Laba Bersih, dan Daftar Piutang Customer.
        </p>
      </div>

      {/* PO Selector Card */}
      <div className="flex justify-center pt-8">
        <Card className="w-full max-w-lg border-border/60 transition-shadow hover:shadow-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto rounded-2xl p-4 bg-indigo-100 dark:bg-indigo-900/40 w-fit mb-3">
              <FileBarChart className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-lg">Pilih Batch PO</CardTitle>
            <CardDescription>
              Pilih Batch PO yang ingin dilihat rekapitulasinya untuk analisis performa atau closing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="po-select"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                Batch PO
              </Label>
              {isLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat daftar PO...
                </div>
              ) : (
                <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                  <SelectTrigger id="po-select" className="w-full">
                    <SelectValue placeholder="Pilih Batch PO..." />
                  </SelectTrigger>
                  <SelectContent>
                    {poList.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Tidak ada Batch PO ditemukan
                      </div>
                    )}
                    {poList.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        <div className="flex items-center gap-2">
                          <span>{po.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({po.status})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleNavigate}
              disabled={!selectedPoId}
              className="w-full gap-2"
            >
              Lihat Rekap PO
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
