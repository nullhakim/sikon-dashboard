import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { uploadService } from "@/lib/services";
import { toast } from "sonner";
import type { DesignModel, DesignModelView } from "@/lib/types/product";

interface Props {
  model: DesignModel | null;
  onChange: (model: DesignModel | null) => void;
}

const TYPES = [
  { value: "long_sleeve", label: "Lengan Panjang" },
  { value: "short_sleeve", label: "Lengan Pendek" },
  { value: "polo", label: "Polo Shirt" },
  { value: "hoodie", label: "Hoodie" },
  { value: "jacket", label: "Jaket" },
];

interface AssetSlotProps {
  label: string;
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}

function AssetSlot({ label, url, uploading, onUpload, onClear }: AssetSlotProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {url ? (
        <div className="relative group rounded-lg border overflow-hidden bg-muted/30" style={{ aspectRatio: "1756/1920" }}>
          <img src={url} alt={label} className="w-full h-full object-contain p-1" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={() => ref.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" /> Ganti
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-7 w-7"
              onClick={onClear}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <input
            ref={ref}
            type="file"
            accept="image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { onUpload(f); e.target.value = ""; } }}
          />
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 cursor-pointer hover:bg-muted/20 hover:border-muted-foreground/40 transition-colors" style={{ aspectRatio: "1756/1920", minHeight: 100 }}>
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-7 w-7 text-muted-foreground/40 mb-1" />
              <span className="text-[11px] text-muted-foreground text-center px-2">Upload PNG</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { onUpload(f); e.target.value = ""; } }}
          />
        </label>
      )}
    </div>
  );
}

export function CanvasDesignerSection({ model, onChange }: Props) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const emptyModel = (): DesignModel => ({
    name: "",
    type: "long_sleeve",
    description: "",
    views: [],
  });

  const updateModel = (patch: Partial<DesignModel>) => onChange({ ...(model ?? emptyModel()), ...patch });

  const getView = (side: "front" | "back"): DesignModelView =>
    model?.views?.find((v) => v.side === side) ?? {
      side,
      art_url: "",
      mask_url: "",
      width: 1756,
      height: 1920,
    };

  const updateView = (side: "front" | "back", patch: Partial<DesignModelView>) => {
    const current = model ?? emptyModel();
    const views = (current.views ?? []).filter((v) => v.side !== side);
    const existing = getView(side);
    const updated = { ...existing, ...patch };
    onChange({ ...current, views: [...views, updated] });
  };

  const handleUpload = async (side: "front" | "back", slot: "art" | "mask", file: File) => {
    const key = `${side}-${slot}`;
    setUploading((p) => ({ ...p, [key]: true }));
    try {
      const res = await uploadService.image(file, "mockups");
      const url = res.data.url;
      if (slot === "art") updateView(side, { art_url: url });
      else updateView(side, { mask_url: url });
      toast.success(`${slot === "art" ? "Lineart" : "Mask"} ${side} berhasil diunggah`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload gagal");
    } finally {
      setUploading((p) => ({ ...p, [key]: false }));
    }
  };

  const clearView = (side: "front" | "back", slot: "art" | "mask") => {
    if (slot === "art") updateView(side, { art_url: "" });
    else updateView(side, { mask_url: "" });
  };

  const hasModel = !!model;

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Canvas Designer Template</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aktifkan untuk menambahkan template lineart & mask untuk custom designer.
          </p>
        </div>
        <Button
          type="button"
          variant={hasModel ? "destructive" : "default"}
          size="sm"
          onClick={() => onChange(hasModel ? null : emptyModel())}
        >
          {hasModel ? "Nonaktifkan" : "Aktifkan Template"}
        </Button>
      </div>

      {hasModel && model && (
        <div className="space-y-4">
          {/* Template Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Nama Template *</Label>
              <Input
                value={model.name}
                onChange={(e) => updateModel({ name: e.target.value })}
                placeholder="e.g. Series 1 — Lengan Panjang"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Produk *</Label>
              <Select value={model.type} onValueChange={(v) => updateModel({ type: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea
                value={model.description ?? ""}
                onChange={(e) => updateModel({ description: e.target.value })}
                rows={2}
                placeholder="Deskripsi template..."
              />
            </div>
          </div>

          {/* Views: Front & Back */}
          {(["front", "back"] as const).map((side) => {
            const view = getView(side);
            return (
              <div key={side} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={side === "front" ? "default" : "secondary"} className="capitalize">
                    {side === "front" ? "Tampak Depan" : "Tampak Belakang"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">1756 × 1920 px</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AssetSlot
                    label="🖊 Lineart (Art PNG)"
                    url={view.art_url}
                    uploading={!!uploading[`${side}-art`]}
                    onUpload={(f) => handleUpload(side, "art", f)}
                    onClear={() => clearView(side, "art")}
                  />
                  <AssetSlot
                    label="🎭 Siluet Mask (PNG)"
                    url={view.mask_url}
                    uploading={!!uploading[`${side}-mask`]}
                    onUpload={(f) => handleUpload(side, "mask", f)}
                    onClear={() => clearView(side, "mask")}
                  />
                </div>
                {view.art_url && view.mask_url && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Kedua aset tersedia</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
