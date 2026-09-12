import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Palette,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/CurrencyInput";
import { materialsService } from "@/lib/services";
import type { MaterialCreatePayload } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";
import type { Material, MaterialColor } from "@/lib/types/material";

export const Route = createFileRoute("/materials")({
  head: () => ({
    meta: [
      { title: "Master Bahan (HPP) — SIKOn ERP" },
      { name: "description", content: "Kelola master bahan baku dan harga satuan untuk perhitungan HPP." },
    ],
  }),
  component: MaterialsPage,
});

// ─── Form State ────────────────────────────────────────────────────────────────

interface ColorFormRow {
  name: string;
  hex_code: string;
}

interface FormState {
  name: string;
  unit: string;
  unit_price: number | "";
  category: string;
  description: string;
  composition: string;
  care_instruction: string;
  gsm_info: string;
  colors: ColorFormRow[];
}

const emptyForm: FormState = {
  name: "",
  unit: "",
  unit_price: "",
  category: "",
  description: "",
  composition: "",
  care_instruction: "",
  gsm_info: "",
  colors: [],
};

// Common unit options — user may also type a custom value
const UNIT_OPTIONS = ["meter", "pcs", "roll", "kg", "lusin"] as const;
const CATEGORY_OPTIONS = ["kain", "aksesoris", "packaging", "lainnya"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  kain: "bg-blue-100 text-blue-700 border-blue-200",
  aksesoris: "bg-amber-100 text-amber-700 border-amber-200",
  packaging: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lainnya: "bg-slate-100 text-slate-700 border-slate-200",
};

// ─── Page Component ────────────────────────────────────────────────────────────

function MaterialsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Custom unit text — shown when user picks "custom" from select
  const [customUnit, setCustomUnit] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["materials", { page, limit }],
    queryFn: () => materialsService.list({ page, limit }),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (body: MaterialCreatePayload) => materialsService.create(body),
    onSuccess: () => {
      toast.success("Bahan berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["materials"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MaterialCreatePayload> }) =>
      materialsService.update(id, body),
    onSuccess: () => {
      toast.success("Bahan berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["materials"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => materialsService.delete(id),
    onSuccess: () => {
      toast.success("Bahan berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Dialog helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setCustomUnit("");
    setCustomCategory("");
    setOpen(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    const knownUnit = UNIT_OPTIONS.includes(m.unit as typeof UNIT_OPTIONS[number]);
    const knownCat  = CATEGORY_OPTIONS.includes(m.category as typeof CATEGORY_OPTIONS[number]);
    setForm({
      name: m.name,
      unit: knownUnit ? m.unit : "custom_unit",
      unit_price: m.unit_price,
      category: knownCat ? m.category : "custom_cat",
      description: m.description ?? "",
      composition: m.composition ?? "",
      care_instruction: m.care_instruction ?? "",
      gsm_info: m.gsm_info ?? "",
      colors: (m.colors ?? []).map((c: MaterialColor) => ({ name: c.name, hex_code: c.hex_code })),
    });
    setCustomUnit(knownUnit ? "" : m.unit);
    setCustomCategory(knownCat ? "" : m.category);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setCustomUnit("");
    setCustomCategory("");
  }

  // ── Color helpers ──────────────────────────────────────────────────────────────

  function addColor() {
    setForm((prev) => ({ ...prev, colors: [...prev.colors, { name: "", hex_code: "#4b5320" }] }));
  }

  function updateColor(idx: number, patch: Partial<ColorFormRow>) {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  function removeColor(idx: number) {
    setForm((prev) => ({ ...prev, colors: prev.colors.filter((_, i) => i !== idx) }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) return toast.error("Nama bahan wajib diisi");

    // Resolve unit
    const unit = form.unit === "custom_unit" ? customUnit.trim() : form.unit;
    if (!unit) return toast.error("Satuan wajib diisi");

    // Resolve category
    const category = form.category === "custom_cat" ? customCategory.trim() : form.category;
    if (!category) return toast.error("Kategori wajib diisi");

    if (form.unit_price === "" || Number(form.unit_price) < 0) {
      return toast.error("Harga satuan wajib diisi (minimal Rp 0)");
    }
    const unit_price = Number(form.unit_price);

    const validColors = form.colors.filter((c) => c.name.trim() && c.hex_code.trim());

    const body: MaterialCreatePayload = {
      name,
      unit,
      unit_price,
      category,
      description: form.description.trim() || undefined,
      composition: form.composition.trim() || undefined,
      care_instruction: form.care_instruction.trim() || undefined,
      gsm_info: form.gsm_info.trim() || undefined,
      colors: validColors.length > 0 ? validColors : undefined,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, body });
    } else {
      createMut.mutate(body);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const saving = createMut.isPending || updateMut.isPending;
  const isKain = form.category === "kain" || (form.category === "custom_cat" && customCategory.toLowerCase() === "kain");

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master Bahan (HPP)</h1>
          <p className="text-sm text-muted-foreground">
            Daftar bahan baku dan harga satuan untuk perhitungan Harga Pokok Produksi.
          </p>
        </div>
        <Button id="btn-add-material" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Tambah Bahan
        </Button>
      </div>

      {/* TABLE CARD */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Semua Bahan Baku
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%]">Nama</TableHead>
                <TableHead className="w-[10%]">Satuan</TableHead>
                <TableHead className="w-[14%]">Kategori</TableHead>
                <TableHead className="w-[18%] text-right">Harga Satuan</TableHead>
                <TableHead className="w-[18%]">Warna</TableHead>
                <TableHead className="w-[12%]">Dibuat</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Memuat data bahan…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Gagal memuat data"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Belum ada bahan. Klik "Tambah Bahan" untuk mulai.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.name}</div>
                    {m.composition && (
                      <div className="text-[11px] text-muted-foreground">{m.composition}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.unit}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs font-normal ${CATEGORY_COLORS[m.category.toLowerCase()] ?? CATEGORY_COLORS["lainnya"]}`}
                    >
                      {m.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatIDR(m.unit_price)}
                  </TableCell>
                  <TableCell>
                    {(m.colors ?? []).length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {m.colors!.slice(0, 8).map((c, i) => (
                          <span
                            key={i}
                            className="h-4 w-4 rounded-full border border-border shrink-0 cursor-default"
                            style={{ backgroundColor: c.hex_code }}
                            title={c.name}
                          />
                        ))}
                        {m.colors!.length > 8 && (
                          <span className="text-[10px] text-muted-foreground">+{m.colors!.length - 8}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(m.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(m)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Hapus bahan "${m.name}"? Aksi ini tidak dapat dibatalkan.`)) {
                            deleteMut.mutate(m.id);
                          }
                        }}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PAGINATION */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Halaman {page} dari {totalPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Bahan" : "Tambah Bahan"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Perbarui data bahan baku ini."
                  : "Tambahkan bahan baku baru ke master HPP."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="mat-name">
                  Nama Bahan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mat-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Kain Ripstop, Kancing 4-lubang"
                  autoFocus
                />
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="mat-unit">
                  Satuan <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.unit}
                  onValueChange={(val) => {
                    setForm({ ...form, unit: val });
                    if (val !== "custom_unit") setCustomUnit("");
                  }}
                >
                  <SelectTrigger id="mat-unit">
                    <SelectValue placeholder="Pilih satuan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom_unit">Lainnya (ketik manual)</SelectItem>
                  </SelectContent>
                </Select>
                {form.unit === "custom_unit" && (
                  <Input
                    id="mat-unit-custom"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Masukkan satuan (e.g. yard, gross)"
                    className="mt-1"
                  />
                )}
              </div>

              {/* Unit Price */}
              <div className="space-y-2">
                <Label htmlFor="mat-price">
                  Harga Satuan <span className="text-destructive">*</span>
                </Label>
                <CurrencyInput
                  id="mat-price"
                  value={form.unit_price}
                  onChange={(val) => setForm({ ...form, unit_price: val })}
                  placeholder="0"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="mat-category">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => {
                    setForm({ ...form, category: val });
                    if (val !== "custom_cat") setCustomCategory("");
                  }}
                >
                  <SelectTrigger id="mat-category">
                    <SelectValue placeholder="Pilih kategori…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom_cat">Lainnya (ketik manual)</SelectItem>
                  </SelectContent>
                </Select>
                {form.category === "custom_cat" && (
                  <Input
                    id="mat-category-custom"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Masukkan kategori"
                    className="mt-1"
                  />
                )}
              </div>

              {/* Technical fields — shown for all, but especially relevant for "kain" */}
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Informasi Teknis {isKain ? "(Kain)" : "(Opsional)"}
                </p>

                <div className="space-y-2">
                  <Label htmlFor="mat-composition" className="text-xs">Komposisi</Label>
                  <Input
                    id="mat-composition"
                    value={form.composition}
                    onChange={(e) => setForm({ ...form, composition: e.target.value })}
                    placeholder="e.g. 65% Polyester / 35% Viscose"
                    className="text-sm"
                  />
                </div>

                {isKain && (
                  <div className="space-y-2">
                    <Label htmlFor="mat-gsm" className="text-xs">GSM Info</Label>
                    <Input
                      id="mat-gsm"
                      value={form.gsm_info}
                      onChange={(e) => setForm({ ...form, gsm_info: e.target.value })}
                      placeholder="e.g. 210 gsm"
                      className="text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="mat-care" className="text-xs">Instruksi Perawatan</Label>
                  <Input
                    id="mat-care"
                    value={form.care_instruction}
                    onChange={(e) => setForm({ ...form, care_instruction: e.target.value })}
                    placeholder="e.g. Cuci suhu ruang, jangan gunakan pemutih klorin"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mat-desc" className="text-xs">Deskripsi</Label>
                  <Textarea
                    id="mat-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="Deskripsi singkat bahan…"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Color Section */}
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> Pilihan Warna
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addColor}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Tambah Warna
                  </Button>
                </div>

                {form.colors.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada pilihan warna. Klik "Tambah Warna" untuk menambahkan.
                  </p>
                )}

                <div className="space-y-2">
                  {form.colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex_code}
                        onChange={(e) => updateColor(idx, { hex_code: e.target.value })}
                        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                        title="Pilih warna"
                      />
                      <Input
                        value={color.hex_code}
                        onChange={(e) => updateColor(idx, { hex_code: e.target.value })}
                        placeholder="#000000"
                        className="w-24 font-mono text-xs"
                      />
                      <Input
                        value={color.name}
                        onChange={(e) => updateColor(idx, { name: e.target.value })}
                        placeholder="Nama warna, e.g. Navy Blue"
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeColor(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
