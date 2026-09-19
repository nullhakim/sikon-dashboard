import { Plus, Trash2, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductFabric } from "@/lib/types/product";
import type { Material } from "@/lib/types/material";
import { materialsService } from "@/lib/services";
import { formatIDR } from "@/lib/format";

interface Props {
  fabrics: ProductFabric[];
  onChange: (fabrics: ProductFabric[]) => void;
}

const emptyFabric = (): ProductFabric => ({
  material_id: "",
  qty_per_unit: 1.5,
  price_adjustment: 0,
  is_default: false,
});

export function FabricSection({ fabrics, onChange }: Props) {
  const [expanded, setExpanded] = useState<number[]>([0]);

  // Satu-satunya sumber data kain: Material (category=kain). Tidak ada lagi
  // SpecTemplate atau field kain yang diketik manual di sini.
  const { data: materialsData } = useQuery({
    queryKey: ["materials", { category: "kain", limit: 100 }],
    queryFn: () => materialsService.list({ page: 1, limit: 100, category: "kain" }),
  });
  const masterKainList: Material[] = materialsData?.data ?? [];

  const toggleExpand = (i: number) =>
    setExpanded((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const update = (i: number, patch: Partial<ProductFabric>) =>
    onChange(fabrics.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addFabric = () => {
    const next = [...fabrics, emptyFabric()];
    onChange(next);
    setExpanded((prev) => [...prev, next.length - 1]);
  };

  const removeFabric = (i: number) => {
    onChange(fabrics.filter((_, idx) => idx !== i));
    setExpanded((prev) => prev.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };

  return (
    <div className="space-y-3">
      {fabrics.map((fabric, i) => {
        const material = masterKainList.find((m) => m.id === fabric.material_id);
        const estCost = material ? material.unit_price * (fabric.qty_per_unit || 0) : 0;

        return (
          <div key={i} className="rounded-lg border bg-muted/20">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => toggleExpand(i)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">
                  {material?.name || `Pilih kain ${i + 1}`}
                </span>
                {fabric.is_default && (
                  <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>
                )}
                {(material?.colors ?? []).length > 0 && (
                  <div className="flex gap-1 shrink-0">
                    {material!.colors!.slice(0, 5).map((c, ci) => (
                      <span
                        key={ci}
                        className="h-3.5 w-3.5 rounded-full border border-border"
                        style={{ background: c.hex_code }}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeFabric(i); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {expanded.includes(i) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {expanded.includes(i) && (
              <div className="border-t px-4 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" /> Pilih Kain (Master Bahan)
                  </Label>
                  <Select
                    value={fabric.material_id}
                    onValueChange={(v) => update(i, { material_id: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih kain dari Master Bahan…" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterKainList.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Belum ada Material kategori kain. Tambahkan dulu di menu Master Bahan.
                        </div>
                      )}
                      {masterKainList.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {m.composition || "—"} · {formatIDR(m.unit_price)}/{m.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview read-only dari Material — TIDAK bisa diedit di sini */}
                {material && (
                  <div className="rounded-md border border-dashed p-3 space-y-1.5 bg-background/50">
                    <p className="text-xs text-muted-foreground">
                      {material.composition && <>Komposisi: {material.composition}<br /></>}
                      {material.care_instruction && <>Cara rawat: {material.care_instruction}</>}
                    </p>
                    {(material.colors ?? []).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-foreground">Warna:</span>
                        {material.colors!.map((c, ci) => (
                          <span key={ci} className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: c.hex_code }} title={c.name} />
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Mau ubah komposisi/cara-rawat/warna kain ini? Edit di halaman{" "}
                      <span className="font-medium">Master Bahan</span>, bukan di sini —
                      supaya semua produk yang pakai kain ini otomatis ikut ter-update.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Konsumsi Kain (per pcs)</Label>
                    <Input
                      type="number" min={0} step={0.1}
                      value={fabric.qty_per_unit}
                      onChange={(e) => update(i, { qty_per_unit: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                    {material && fabric.qty_per_unit > 0 && (
                      <p className="text-[10px] text-muted-foreground">≈ {formatIDR(estCost)}/pcs (cost)</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Markup Harga Jual (Rp)</Label>
                    <Input
                      type="number"
                      value={fabric.price_adjustment}
                      onChange={(e) => update(i, { price_adjustment: Number(e.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id={`fabric-default-${i}`}
                    checked={fabric.is_default}
                    onCheckedChange={(v) => update(i, { is_default: v })}
                  />
                  <Label htmlFor={`fabric-default-${i}`} className="text-xs">Kain Default</Label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" className="w-full" onClick={addFabric}>
        <Plus className="h-4 w-4 mr-2" /> Tambah Pilihan Kain
      </Button>
    </div>
  );
}