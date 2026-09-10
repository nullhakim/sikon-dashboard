/**
 * ProductMaterialsSection
 *
 * Displays and manages the Bill of Materials (Resep Produk) for a given product.
 *
 * - Read-only table view shows the saved recipe with per-line and total estimates.
 * - "Kelola Resep" button opens a Dialog where the user can add/remove/edit BOM rows.
 * - Save uses PUT /products/:id/materials (replace-all semantics — always sends full list).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FlaskConical, ChevronRight } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { materialsService, productMaterialsService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { ProductMaterial, Material } from "@/lib/types/material";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BomRow {
  /** undefined for new unsaved rows */
  material_id: string;
  qty_per_unit: number | "";
}

const emptyRow = (): BomRow => ({ material_id: "", qty_per_unit: "" });

// ─── Helpers ───────────────────────────────────────────────────────────────────

function calcRowSubtotal(row: BomRow, materials: Material[]): number {
  if (!row.material_id || row.qty_per_unit === "") return 0;
  const mat = materials.find((m) => m.id === row.material_id);
  if (!mat) return 0;
  return mat.unit_price * Number(row.qty_per_unit);
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ProductMaterialsSection({ productId }: { productId: string }) {
  const { isOwner, isAccounting } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<BomRow[]>([]);

  // ── Data queries ───────────────────────────────────────────────────────────

  /** Saved BOM for this product */
  const bomQ = useQuery({
    queryKey: ["product-materials", productId],
    queryFn: () => productMaterialsService.getForProduct(productId),
    enabled: isOwner || isAccounting,
  });

  /** All materials — used to populate the Select in edit dialog */
  const matsQ = useQuery({
    queryKey: ["materials-all"],
    queryFn: () => materialsService.list({ limit: 100 }),
    staleTime: 60_000,
    enabled: isOwner || isAccounting,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────

  const saveMut = useMutation({
    mutationFn: (items: { material_id: string; qty_per_unit: number }[]) =>
      productMaterialsService.setForProduct(productId, items),
    onSuccess: () => {
      toast.success("Resep produk berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["product-materials", productId] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isOwner && !isAccounting) {
    return null;
  }

  const savedRows: ProductMaterial[] = bomQ.data?.data ?? [];
  const allMaterials: Material[] = matsQ.data?.data ?? [];

  // ── Dialog open — pre-populate rows from saved BOM ────────────────────────

  function openDialog() {
    const initial: BomRow[] =
      savedRows.length > 0
        ? savedRows.map((r) => ({
            material_id: r.material_id,
            qty_per_unit: r.qty_per_unit,
          }))
        : [emptyRow()];
    setRows(initial);
    setDialogOpen(true);
  }

  // ── Row helpers ────────────────────────────────────────────────────────────

  function addRow() {
    setRows((r) => [...r, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, patch: Partial<BomRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSave() {
    // Validate every row has material_id and qty_per_unit > 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.material_id) {
        return toast.error(`Baris ${i + 1}: pilih bahan terlebih dahulu`);
      }
      if (row.qty_per_unit === "" || Number(row.qty_per_unit) <= 0) {
        return toast.error(`Baris ${i + 1}: qty per unit harus lebih dari 0`);
      }
    }

    const items = rows.map((r) => ({
      material_id: r.material_id,
      qty_per_unit: Number(r.qty_per_unit),
    }));

    saveMut.mutate(items);
  }

  // ── Live total in dialog ───────────────────────────────────────────────────

  const dialogTotal = rows.reduce((acc, row) => acc + calcRowSubtotal(row, allMaterials), 0);

  // ── Saved BOM total ────────────────────────────────────────────────────────

  const savedTotal = savedRows.reduce((acc, r) => {
    const price = r.material?.unit_price ?? 0;
    return acc + price * r.qty_per_unit;
  }, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            Resep Produk (BOM)
          </CardTitle>
          <Button
            id="btn-kelola-resep"
            variant="outline"
            size="sm"
            onClick={openDialog}
            className="gap-1"
          >
            Kelola Resep <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {bomQ.isLoading && (
            <div className="p-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {!bomQ.isLoading && savedRows.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Belum ada resep produk. Klik "Kelola Resep" untuk menambahkan bahan.
            </div>
          )}
          {!bomQ.isLoading && savedRows.length > 0 && (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Bahan</TableHead>
                  <TableHead className="w-[100px]">Satuan</TableHead>
                  <TableHead className="w-[120px] text-right">Qty / pcs</TableHead>
                  <TableHead className="w-[160px] text-right">Subtotal / pcs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.material?.name ?? r.material_id}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.material?.unit ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.qty_per_unit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatIDR((r.material?.unit_price ?? 0) * r.qty_per_unit)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="border-t-2 bg-muted/20">
                  <TableCell colSpan={3} className="font-semibold text-sm">
                    Estimasi HPP Material / pcs
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatIDR(savedTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── EDIT DIALOG ─────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : setDialogOpen(false))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Resep Produk (BOM)</DialogTitle>
            <DialogDescription>
              Tambah, edit, atau hapus bahan baku. Menyimpan akan <strong>mengganti seluruh resep</strong> yang ada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Header labels */}
            <div className="grid grid-cols-[1fr_130px_40px] gap-2 px-1">
              <Label className="text-xs text-muted-foreground">Bahan (Material)</Label>
              <Label className="text-xs text-muted-foreground">Qty per pcs</Label>
              <span />
            </div>

            {/* Rows */}
            {rows.map((row, idx) => {
              const mat = allMaterials.find((m) => m.id === row.material_id);
              const subtotal = calcRowSubtotal(row, allMaterials);
              return (
                <div key={idx} className="space-y-1">
                  <div className="grid grid-cols-[1fr_130px_40px] gap-2 items-center">
                    {/* Material select */}
                    <Select
                      value={row.material_id}
                      onValueChange={(val) => updateRow(idx, { material_id: val })}
                      disabled={matsQ.isLoading}
                    >
                      <SelectTrigger id={`bom-mat-${idx}`} className="h-9 text-sm">
                        <SelectValue placeholder={matsQ.isLoading ? "Memuat…" : "Pilih bahan…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {allMaterials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.unit}) — {formatIDR(m.unit_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Qty input */}
                    <Input
                      id={`bom-qty-${idx}`}
                      type="number"
                      min={0}
                      step="any"
                      value={row.qty_per_unit}
                      onChange={(e) =>
                        updateRow(idx, {
                          qty_per_unit: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="h-9 text-sm font-mono"
                    />

                    {/* Remove row */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(idx)}
                      title="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Inline subtotal hint */}
                  {mat && row.qty_per_unit !== "" && (
                    <p className="text-[11px] text-muted-foreground pl-1">
                      {row.qty_per_unit} {mat.unit} × {formatIDR(mat.unit_price)} ={" "}
                      <span className="font-semibold text-foreground">{formatIDR(subtotal)}</span>
                    </p>
                  )}
                </div>
              );
            })}

            {/* Add row */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1 border-dashed"
              onClick={addRow}
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Bahan
            </Button>

            {/* Live total preview */}
            {rows.length > 0 && (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3 mt-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  Estimasi HPP Material / pcs
                </span>
                <span className="text-base font-bold text-primary">{formatIDR(dialogTotal)}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              id="btn-simpan-resep"
              type="button"
              disabled={saveMut.isPending || rows.length === 0}
              onClick={handleSave}
            >
              {saveMut.isPending ? "Menyimpan…" : "Simpan Resep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
