import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { ProductFabric, FabricColor } from "@/lib/types/product";

interface Props {
  fabrics: ProductFabric[];
  onChange: (fabrics: ProductFabric[]) => void;
}

const emptyFabric = (): ProductFabric => ({
  name: "",
  description: "",
  composition: "",
  care_instruction: "",
  base_price: 0,
  price_adjustment: 0,
  is_default: false,
  colors: [],
});

const emptyColor = (): FabricColor => ({ name: "", hex_code: "#4b5320" });

export function FabricSection({ fabrics, onChange }: Props) {
  const [expanded, setExpanded] = useState<number[]>([0]);

  const toggleExpand = (i: number) =>
    setExpanded((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const update = (i: number, patch: Partial<ProductFabric>) => {
    const next = fabrics.map((f, idx) => idx === i ? { ...f, ...patch } : f);
    onChange(next);
  };

  const addFabric = () => {
    const next = [...fabrics, emptyFabric()];
    onChange(next);
    setExpanded((prev) => [...prev, next.length - 1]);
  };

  const removeFabric = (i: number) => {
    onChange(fabrics.filter((_, idx) => idx !== i));
    setExpanded((prev) => prev.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };

  const updateColor = (fi: number, ci: number, patch: Partial<FabricColor>) => {
    const colors = (fabrics[fi].colors ?? []).map((c, idx) =>
      idx === ci ? { ...c, ...patch } : c
    );
    update(fi, { colors });
  };

  const addColor = (fi: number) => update(fi, { colors: [...(fabrics[fi].colors ?? []), emptyColor()] });
  const removeColor = (fi: number, ci: number) =>
    update(fi, { colors: (fabrics[fi].colors ?? []).filter((_, idx) => idx !== ci) });

  return (
    <div className="space-y-3">
      {fabrics.map((fabric, i) => (
        <div key={i} className="rounded-lg border bg-muted/20">
          {/* Header */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => toggleExpand(i)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {fabric.name || `Fabric ${i + 1}`}
              </span>
              {fabric.is_default && (
                <Badge variant="secondary" className="text-xs shrink-0">Default</Badge>
              )}
              {(fabric.colors ?? []).length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {fabric.colors!.slice(0, 5).map((c, ci) => (
                    <span
                      key={ci}
                      className="h-3.5 w-3.5 rounded-full border border-border"
                      style={{ background: c.hex_code }}
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

          {/* Body */}
          {expanded.includes(i) && (
            <div className="border-t px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nama Kain *</Label>
                  <Input
                    value={fabric.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="e.g. Ripstop Cotton 65/35"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Komposisi</Label>
                  <Input
                    value={fabric.composition ?? ""}
                    onChange={(e) => update(i, { composition: e.target.value })}
                    placeholder="e.g. 65% Cotton / 35% Polyester"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga Dasar Kain (IDR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={fabric.base_price ?? 0}
                    onChange={(e) => update(i, { base_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price Adjustment (IDR)</Label>
                  <Input
                    type="number"
                    value={fabric.price_adjustment ?? 0}
                    onChange={(e) => update(i, { price_adjustment: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch
                    id={`fabric-default-${i}`}
                    checked={!!fabric.is_default}
                    onCheckedChange={(v) => update(i, { is_default: v })}
                  />
                  <Label htmlFor={`fabric-default-${i}`} className="text-xs">Kain Default</Label>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Deskripsi</Label>
                  <Textarea
                    value={fabric.description ?? ""}
                    onChange={(e) => update(i, { description: e.target.value })}
                    rows={2}
                    placeholder="Deskripsi singkat kain..."
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Instruksi Perawatan</Label>
                  <Input
                    value={fabric.care_instruction ?? ""}
                    onChange={(e) => update(i, { care_instruction: e.target.value })}
                    placeholder="e.g. Cuci tangan, jangan diperas"
                  />
                </div>
              </div>

              {/* Color Swatches */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Pilihan Warna</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addColor(i)}>
                    <Plus className="h-3 w-3 mr-1" /> Tambah Warna
                  </Button>
                </div>
                {(fabric.colors ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Belum ada pilihan warna.</p>
                )}
                <div className="space-y-2">
                  {(fabric.colors ?? []).map((color, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex_code}
                        onChange={(e) => updateColor(i, ci, { hex_code: e.target.value })}
                        className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                      />
                      <Input
                        value={color.hex_code}
                        onChange={(e) => updateColor(i, ci, { hex_code: e.target.value })}
                        placeholder="#4b5320"
                        className="w-24 font-mono text-xs"
                      />
                      <Input
                        value={color.name}
                        onChange={(e) => updateColor(i, ci, { name: e.target.value })}
                        placeholder="Nama warna, e.g. Olive"
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeColor(i, ci)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addFabric}>
        <Plus className="h-4 w-4 mr-2" /> Tambah Varian Kain
      </Button>
    </div>
  );
}
