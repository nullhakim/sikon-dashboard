import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/format";
import type { WholesaleTier, ProductFabric } from "@/lib/types/product";

interface Props {
  tiers: WholesaleTier[];
  fabrics: ProductFabric[];
  onChange: (tiers: WholesaleTier[]) => void;
}

const emptyTier = (): WholesaleTier => ({ min_qty: 1, unit_price: 0 });

export function WholesaleSection({ tiers, fabrics, onChange }: Props) {
  const update = (i: number, patch: Partial<WholesaleTier>) => {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {tiers.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Belum ada tier harga grosir. Klik tombol di bawah untuk menambahkan.
        </p>
      )}

      {tiers.map((tier, i) => (
        <div key={i} className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tier {i + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {fabrics.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Khusus Kain (opsional)</Label>
              <Select
                value={tier.fabric_id ?? "all"}
                onValueChange={(v) => update(i, { fabric_id: v === "all" ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Semua kain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kain</SelectItem>
                  {fabrics.map((f, fi) => (
                    <SelectItem key={fi} value={f.id ?? `fabric-${fi}`}>
                      {f.name || `Fabric ${fi + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Min Qty *</Label>
              <Input
                type="number"
                min={1}
                value={tier.min_qty}
                onChange={(e) => update(i, { min_qty: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Qty (opsional)</Label>
              <Input
                type="number"
                min={1}
                value={tier.max_qty ?? ""}
                placeholder="∞"
                onChange={(e) =>
                  update(i, { max_qty: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Harga/pcs (IDR) *</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={tier.unit_price}
                onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
              />
            </div>
          </div>

          {tier.unit_price > 0 && (
            <p className="text-xs text-muted-foreground">
              {tier.min_qty} – {tier.max_qty ?? "∞"} pcs &rarr; {" "}
              <span className="font-semibold text-foreground">{formatIDR(tier.unit_price)}</span>/pcs
            </p>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={() => onChange([...tiers, emptyTier()])}>
        <Plus className="h-4 w-4 mr-2" /> Tambah Tier Harga
      </Button>
    </div>
  );
}
