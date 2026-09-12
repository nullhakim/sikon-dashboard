import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye, Pencil, Search, Filter, X, CalendarIcon, FileText, Check, ChevronsUpDown, Banknote } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AddPaymentDialog } from "@/components/AddPaymentDialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
// ScrollArea import removed

import { ordersService, customersService, productsService, usersService, specTemplatesService, bankAccountsService, paymentsService, batchPosService } from "@/lib/services";
import { formatIDR, formatDate, translateOrderErrorMessage } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { QuickCreateCustomerDialog } from "@/components/QuickCreateCustomerDialog";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";

// TODO: Replace with real auth context when authentication is implemented.
const currentUser = { role: "admin" };

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — SIKOn ERP" },
      { name: "description", content: "Manage konveksi orders: create, view, update status." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    search: typeof search.search === "string" ? search.search : "",
    order_status: typeof search.order_status === "string" ? search.order_status : "",
    payment_status: typeof search.payment_status === "string" ? search.payment_status : "",
    start_date: typeof search.start_date === "string" ? search.start_date : "",
    end_date: typeof search.end_date === "string" ? search.end_date : "",
    sales_id: typeof search.sales_id === "string" ? search.sales_id : "",
    batch_po_id: typeof search.batch_po_id === "string" ? search.batch_po_id : "",
  }),
  component: OrdersPage,
});

const statusList: OrderStatus[] = ["quotation", "pending", "production", "ready", "completed", "canceled"];
const paymentStatusList = ["unpaid", "partial", "paid"];

const statusVariant: Record<string, string> = {
  quotation: "bg-violet-100 text-violet-800 border-violet-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  production: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-cyan-100 text-cyan-800 border-cyan-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  canceled: "bg-rose-100 text-rose-800 border-rose-200",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const key = `order_status.${status?.toLowerCase()}` as any;
  const label = t(key, status ?? "—");
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export interface DetailPartForm {
  part: string;
  material_name: string;
  warna?: string;
  spec: string;
}

export interface Item {
  id?: string;
  product_id: string;
  custom_name?: string;       // New: optional display-name override
  qty: number;
  price: number;
  /** UUID material kain (dari product.fabrics[].fabric_id) */
  fabric_id?: string;
  /** UUID warna kain (dari product.fabrics[i].colors[j].id) */
  fabric_color_id?: string;
  // New: dynamic multi-part materials array
  details: DetailPartForm[];
  // Legacy quotation-only top-level fields (kept for backward compat)
  benang?: string;
  bordir?: string;
  jahitan?: string;
}

export const BORDIR_AUTOFILL = "Bordir Menggunakan Sistem Komputerisasi";
export const BENANG_AUTOFILL = "Benang Bordir Menggunakan Benang Polyster";

/** Build the `details` array payload from the form state. */
export function buildItemDetails(
  it: Item,
  _isQuotation?: boolean,
): DetailPartForm[] | undefined {
  if (!it) return undefined;

  let rawDetails: any = it.details;
  if (typeof rawDetails === "string") {
    try {
      rawDetails = JSON.parse(rawDetails);
    } catch {
      rawDetails = [];
    }
  }

  let detailsArray: any[] = [];
  if (Array.isArray(rawDetails)) {
    detailsArray = rawDetails;
  } else if (rawDetails && typeof rawDetails === "object" && Array.isArray((rawDetails as any).parts)) {
    detailsArray = (rawDetails as any).parts;
  }

  const parts = detailsArray.filter(
    (d) =>
      d &&
      typeof d === "object" &&
      ((d.part && String(d.part).trim()) ||
        (d.material_name && String(d.material_name).trim()) ||
        (d.spec && String(d.spec).trim()) ||
        (d.warna && String(d.warna).trim())),
  );
  return parts.length > 0 ? parts : undefined;
}

/** Helper for formatting currency string in real time (e.g. 150000 -> 150.000) */
function formatNumberWithThousandSeparators(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val.replace(/\D/g, "")) : val;
  if (isNaN(num)) return "";
  return num.toLocaleString("id-ID");
}

/** Helper component for currency input with "Rp" prefix and thousand separators */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
  disabled = false,
  id,
}: {
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}) {
  const displayValue = formatNumberWithThousandSeparators(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      onChange("");
    } else {
      const parsed = parseInt(rawDigits, 10);
      onChange(isNaN(parsed) ? "" : parsed);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-2.5 text-xs text-muted-foreground font-medium pointer-events-none select-none">
        Rp
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className={cn("pl-8 text-xs font-mono tabular-nums", className)}
      />
    </div>
  );
}

/** Helper: parse legacy details (object) or new details (array) from backend into form state. */
export function parseDetailsFromBackend(
  raw: any,
): DetailPartForm[] {
  if (!raw) return [{ part: "", material_name: "", warna: "", spec: "" }];

  let parsedRaw = raw;
  if (typeof raw === "string") {
    try {
      parsedRaw = JSON.parse(raw);
    } catch {
      return [{ part: "", material_name: "", warna: "", spec: "" }];
    }
  }

  // New shape: array of {part, material_name, spec}
  if (Array.isArray(parsedRaw)) {
    const parsed = parsedRaw.filter((r: any) => r && typeof r === "object");
    return parsed.length > 0
      ? parsed.map((r: any) => ({
          part: r.part ?? "",
          material_name: r.material_name ?? "",
          warna: r.warna ?? "",
          spec: r.spec ?? "",
        }))
      : [{ part: "", material_name: "", warna: "", spec: "" }];
  }
  // Object shape with parts array
  if (parsedRaw && typeof parsedRaw === "object" && Array.isArray(parsedRaw.parts)) {
    const parsed = parsedRaw.parts.filter((r: any) => r && typeof r === "object");
    return parsed.length > 0
      ? parsed.map((r: any) => ({
          part: r.part ?? "",
          material_name: r.material_name ?? "",
          warna: r.warna ?? "",
          spec: r.spec ?? "",
        }))
      : [{ part: "", material_name: "", warna: "", spec: "" }];
  }
  // Legacy object shape — migrate to single-block array
  if (parsedRaw && typeof parsedRaw === "object") {
    const b = parsedRaw.bahan ?? parsedRaw.Bahan ?? {};
    const bahanName =
      (typeof b === "object" ? b.name ?? b.Name : b) ??
      parsedRaw.bahan_name ??
      "";
    const spec =
      (typeof b === "object" ? b.spec ?? b.Spec : undefined) ??
      parsedRaw["Bahan Kemeja"] ??
      (parsedRaw.ukuran ? `Ukuran: ${parsedRaw.ukuran}` : "");
    const warna = parsedRaw.Warna ?? parsedRaw.warna ?? (typeof b === "object" ? b.Color ?? b.color : "") ?? "";
    return [
      {
        part: "",
        material_name: typeof bahanName === "string" ? bahanName : "",
        warna: typeof warna === "string" ? warna : "",
        spec: typeof spec === "string" ? spec : "",
      },
    ];
  }
  return [{ part: "", material_name: "", warna: "", spec: "" }];
}


export function ItemDetailsFields({
  item,
  isQuotation,
  hideSpec,
  hideCustomName,
  onChange,
}: {
  item: Item;
  isQuotation: boolean;
  hideSpec?: boolean;
  hideCustomName?: boolean;
  onChange: (patch: Partial<Item>) => void;
}) {
  const specs = useQuery({
    queryKey: ["spec-templates", { limit: 100 }],
    queryFn: () => specTemplatesService.list({ page: 1, limit: 100 }),
  });

  // Fetch product detail untuk mendapatkan fabrics[]
  const productDetail = useQuery({
    queryKey: ["products", item.product_id],
    queryFn: () => productsService.get(item.product_id),
    enabled: !!item.product_id,
  });
  const productFabrics = productDetail.data?.data?.fabrics ?? [];
  const selectedFabric = productFabrics.find((f) => f.fabric_id === item.fabric_id || f.id === item.fabric_id);
  const availableColors = selectedFabric?.colors ?? [];

  let detailsArray: DetailPartForm[] = [];
  if (Array.isArray(item.details)) {
    detailsArray = item.details;
  } else if (item.details) {
    detailsArray = parseDetailsFromBackend(item.details);
  } else {
    detailsArray = [{ part: "", material_name: "", warna: "", spec: "" }];
  }
  const details = detailsArray;

  const [modalOpen, setModalOpen] = useState(false);
  const [currentPart, setCurrentPart] = useState<DetailPartForm>({ part: "", material_name: "", warna: "", spec: "" });
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const openAddModal = () => {
    setCurrentPart({ part: "", material_name: "", warna: "", spec: "" });
    setEditIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (idx: number) => {
    setCurrentPart(details[idx]);
    setEditIndex(idx);
    setModalOpen(true);
  };

  const savePart = () => {
    if (editIndex !== null) {
      onChange({
        details: details.map((d, i) => (i === editIndex ? currentPart : d)),
      });
    } else {
      onChange({
        details: [...details, currentPart],
      });
    }
    setModalOpen(false);
  };

  const removePart = (idx: number) =>
    onChange({ details: details.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3 pt-2 border-t">
      {/* Custom Name */}
      {!hideCustomName && (
        <div className="space-y-1">
          <Label className="text-xs">Custom Product Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
          <Input
            placeholder="e.g., Seragam PDH Bank Mandiri"
            value={item.custom_name ?? ""}
            onChange={(e) => onChange({ custom_name: e.target.value })}
          />
        </div>
      )}

      {/* Fabric & Color Selection — dari product.fabrics[] */}
      {item.product_id && (
        <div className="space-y-2 rounded-md border border-dashed border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Kain &amp; Warna (HPP)</p>

          {/* Fabric dropdown */}
          {productFabrics.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">Pilih Kain</Label>
              <select
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
                value={item.fabric_id ?? ""}
                onChange={(e) => {
                  const fid = e.target.value;
                  const fab = productFabrics.find((f) => (f.fabric_id ?? f.id) === fid);
                  onChange({
                    fabric_id: fid || undefined,
                    fabric_color_id: undefined,
                    // auto-fill price dari base_price kain
                    price: fab?.base_price ? fab.base_price : item.price,
                  });
                }}
              >
                <option value="">Pilih kain…</option>
                {productFabrics.map((f, fi) => (
                  <option key={fi} value={f.fabric_id ?? f.id ?? fi}>
                    {f.name}{f.base_price ? ` — ${f.base_price.toLocaleString("id-ID")}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            productDetail.isLoading ? (
              <p className="text-[11px] text-muted-foreground">Memuat data produk…</p>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">Produk ini belum punya data kain. Tambahkan di master produk.</p>
            )
          )}

          {/* Color swatches — muncul setelah pilih kain */}
          {item.fabric_id && availableColors.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Pilih Warna</Label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((c, ci) => {
                  const colorId = c.id ?? c.name;
                  const isSelected = item.fabric_color_id === colorId;
                  return (
                    <button
                      key={ci}
                      type="button"
                      title={c.name}
                      onClick={() => onChange({ fabric_color_id: isSelected ? undefined : colorId })}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 font-semibold"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-border/50 shrink-0"
                        style={{ backgroundColor: c.hex_code }}
                      />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Material Parts Array */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Material / Specification</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={openAddModal}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Material Part
          </Button>
        </div>

        {details.map((part, idx) => (
          <div
            key={idx}
            className="rounded-md border bg-muted/20 p-3 flex items-center justify-between gap-4"
          >
            <div className="space-y-1 overflow-hidden">
               <div className="text-xs font-medium truncate">{part.part || `Part ${idx + 1}`}</div>
               <div className="text-xs text-muted-foreground truncate">
                 {part.material_name || "-"} {part.warna ? `(${part.warna})` : ''}
               </div>
               {!hideSpec && part.spec && (
                 <div className="text-xs text-muted-foreground truncate">
                   {part.spec}
                 </div>
               )}
            </div>
            <div className="flex gap-1 shrink-0">
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="h-6 px-2 text-xs"
                 onClick={() => openEditModal(idx)}
               >
                 <Pencil className="h-3 w-3" />
               </Button>
               {details.length > 1 && (
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                   onClick={() => removePart(idx)}
                 >
                   <Trash2 className="h-3 w-3" />
                 </Button>
               )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? "Edit Material Part" : "Add Material Part"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Part Name</Label>
              <Input
                placeholder="e.g., Kemeja, Celana, Topi"
                value={currentPart.part}
                onChange={(e) => setCurrentPart(prev => ({ ...prev, part: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Material Name</Label>
              <Select
                value={specs.data?.data?.find(x => x.name === currentPart.material_name)?.id ?? ""}
                onValueChange={(templateId) => {
                  const t = specs.data?.data?.find((x) => x.id === templateId);
                  if (!t) return;
                  // Auto-fill spec: gunakan spec, fallback ke description jika spec kosong
                  const autoSpec = t.spec || t.description || "";
                  const defaultColor = t.colors && t.colors.length > 0 ? t.colors[0].name : undefined;
                  setCurrentPart(prev => ({
                    ...prev,
                    material_name: t.name,
                    ...(!prev.spec ? { spec: autoSpec } : {}),
                    ...(!prev.warna && defaultColor ? { warna: defaultColor } : {}),
                  }));
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pilih dari Master Kain Global…" />
                </SelectTrigger>
                <SelectContent>
                  {specs.data?.data?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{t.name}</span>
                        {t.composition && (
                          <span className="text-xs text-muted-foreground">{t.composition}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Tampilkan detail template yang dipilih */}
              {(() => {
                const selected = specs.data?.data?.find(x => x.name === currentPart.material_name);
                if (!selected) return null;
                const hint = selected.description || selected.spec;
                return hint ? (
                  <p className="text-[11px] text-muted-foreground italic px-1">{hint.length > 100 ? hint.slice(0, 100) + "…" : hint}</p>
                ) : null;
              })()}
              <Input
                className="mt-1 h-7 text-xs"
                placeholder="Or type a custom material name…"
                value={currentPart.material_name}
                onChange={(e) => setCurrentPart(prev => ({ ...prev, material_name: e.target.value }))}
              />
            </div>
            {(() => {
              const selectedTemplate = specs.data?.data?.find(x => x.name === currentPart.material_name);
              const availableColors = selectedTemplate?.colors ?? [];

              return (
                <div className="space-y-1">
                  <Label className="text-xs">Warna</Label>
                  {availableColors.length > 0 ? (
                    <div className="space-y-1">
                      <Select
                        value={currentPart.warna ?? ""}
                        onValueChange={(val) =>
                          setCurrentPart((prev) => ({ ...prev, warna: val }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Pilih warna dari template kain…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map((c) => (
                            <SelectItem key={c.id || c.name} value={c.name}>
                              <div className="flex items-center gap-2">
                                {c.hex_code && (
                                  <span
                                    className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                                    style={{ backgroundColor: c.hex_code }}
                                  />
                                )}
                                <span>{c.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Atau ketik warna kustom…"
                        value={currentPart.warna ?? ""}
                        onChange={(e) =>
                          setCurrentPart((prev) => ({ ...prev, warna: e.target.value }))
                        }
                      />
                    </div>
                  ) : (
                    <Input
                      className="h-7 text-xs"
                      placeholder="e.g., Navy Blue, Hitam"
                      value={currentPart.warna ?? ""}
                      onChange={(e) =>
                        setCurrentPart((prev) => ({ ...prev, warna: e.target.value }))
                      }
                    />
                  )}
                </div>
              );
            })()}
            {!hideSpec && (
              <div className="space-y-1">
                <Label className="text-xs">Specification</Label>
                <Textarea
                  rows={2}
                  placeholder="e.g., Warna Navy Blue, Bordir Logo Dada Kiri"
                  value={currentPart.spec}
                  onChange={(e) => setCurrentPart(prev => ({ ...prev, spec: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={savePart}>Save Part</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation-only legacy fields */}
      {isQuotation && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bordir</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onChange({ bordir: BORDIR_AUTOFILL })}
              >
                Auto-fill
              </Button>
            </div>
            <Input
              placeholder={BORDIR_AUTOFILL}
              value={item.bordir ?? ""}
              onChange={(e) => onChange({ bordir: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Benang</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onChange({ benang: BENANG_AUTOFILL })}
              >
                Auto-fill
              </Button>
            </div>
            <Input
              placeholder={BENANG_AUTOFILL}
              value={item.benang ?? ""}
              onChange={(e) => onChange({ benang: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Jahitan</Label>
            <Input
              placeholder="mis. Jahit rapi double stitch"
              value={item.jahitan ?? ""}
              onChange={(e) => onChange({ jahitan: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function CreateOrderDialog({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const isQuotation = true;
  const qc = useQueryClient();
  const { isSales, user } = useAuth();

  const [customerId, setCustomerId] = useState("");
  const [salesId, setSalesId] = useState("");
  const [batchPoId, setBatchPoId] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  // Combobox Popover states
  const [salesPopoverOpen, setSalesPopoverOpen] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  // If logged-in user is Sales, fetch single user details GET /users/{id}
  const currentUserDetail = useQuery({
    queryKey: ["users", user?.id],
    queryFn: () => usersService.get(user!.id!),
    enabled: open && isSales && !!user?.id,
  });

  const customers = useQuery({
    queryKey: ["customers", { sales_id: salesId, limit: 100 }],
    queryFn: () => customersService.list({ page: 1, limit: 100, sales_id: salesId }),
    enabled: open && !!salesId,
  });
  const products = useQuery({
    queryKey: ["products", { page: 1, limit: 100 }],
    queryFn: () => productsService.list({ page: 1, limit: 100 }),
    enabled: open,
  });
  // Only query all sales users list if user is NOT sales
  const users = useQuery({
    queryKey: ["users", "sales"],
    queryFn: () => usersService.list({ role: "sales", limit: 100 }),
    enabled: open && !isSales,
  });
  const activeBatchPOs = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
    enabled: open,
  });

  // Derive the currently selected BatchPO object for guard checks
  const selectedBatchPO = activeBatchPOs.data?.data?.find((b) => b.id === batchPoId);
  const isBatchPOClosed = selectedBatchPO?.status === "closed";
  const currentUserRole = user?.role ?? "";
  const isFormLocked = isBatchPOClosed && currentUserRole !== "owner";

  const [courier, setCourier] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [items, setItems] = useState<Item[]>([{ product_id: "", qty: 1, price: 0, details: [] }]);

  const [isTaxable, setIsTaxable] = useState(false);
  const [taxPpnRate, setTaxPpnRate] = useState<number | "">(12.00);
  const [taxPph22Rate, setTaxPph22Rate] = useState<number | "">(1.50);

  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("dp");
  const [paymentBankId, setPaymentBankId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", "user", salesId],
    queryFn: () => bankAccountsService.byUser(salesId!),
    enabled: open && !!salesId,
  });

  const globalBankAccounts = useQuery({
    queryKey: ["bank-accounts", "global"],
    queryFn: () => bankAccountsService.global(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (isSales && user?.id) {
        setSalesId(user.id);
      }
    } else {
      setCustomerId("");
      setSalesId("");
      setBatchPoId("");
      setCourier("");
      setShippingCost("");
      setNote("");
      setTermsConditions("");
      setIsTaxable(false);
      setTaxPpnRate(12.00);
      setTaxPph22Rate(1.50);
      setItems([{ product_id: "", qty: 1, price: 0, details: [] }]);
      setPaymentAmount("");
      setPaymentType("dp");
      setPaymentBankId("");
      setPaymentReference("");
    }
  }, [open, isSales, user]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = Number(shippingCost || 0);
  const ppnRateNum = Number(taxPpnRate || 0);
  const pph22RateNum = Number(taxPph22Rate || 0);

  const dppPpn = isTaxable ? subtotal / 1.09 : 0;
  const ppnAmount = isTaxable ? dppPpn * (ppnRateNum / 100) : 0;
  const pph22Amount = isTaxable ? dppPpn * (pph22RateNum / 100) : 0;

  const paguBelanja = isTaxable ? subtotal + shipping + ppnAmount : subtotal + shipping;
  const netCashIn = isTaxable ? paguBelanja - (ppnAmount + pph22Amount) : subtotal + shipping;
  const total = isTaxable ? paguBelanja : subtotal + shipping;

  const create = useMutation({
    mutationFn: () =>
      ordersService.create({
        batch_po_id: batchPoId,
        customer_id: customerId,
        sales_id: salesId,
        courier_name: courier || undefined,
        shipping_cost: shipping,
        is_taxable: isTaxable,
        tax_ppn_rate: isTaxable ? ppnRateNum : undefined,
        tax_pph22_rate: isTaxable ? pph22RateNum : undefined,
        notes: note || undefined,
        terms_conditions: termsConditions || undefined,
        order_status: "quotation",
        items: items
          .filter((i) => i.product_id && i.qty > 0)
          .map((i) => ({
            product_id: i.product_id,
            fabric_id: i.fabric_id || undefined,
            fabric_color_id: i.fabric_color_id || undefined,
            custom_name: i.custom_name || undefined,
            qty: i.qty,
            price: i.price,
            details: {
              parts: buildItemDetails(i) || [],
              bordir: i.bordir,
              benang: i.benang,
              jahitan: i.jahitan
            },
          })),
      }),
    onSuccess: async (res: any) => {
      toast.success(isQuotation ? "Quotation created" : "Order created");
      qc.invalidateQueries({ queryKey: ["orders"] });
      
      const orderId = res?.data?.id || res?.id;
      if (orderId && Number(paymentAmount) > 0) {
        try {
          await paymentsService.create({
            order_id: orderId,
            amount: Number(paymentAmount),
            payment_type: paymentType,
            bank_account_id: paymentBankId,
            reference_number: paymentReference || "DIRECT-PAYMENT",
            payment_date: new Date().toISOString()
          });
          toast.success("Initial payment recorded");
          if (paymentType === "dp" || paymentType === "settlement") {
            try {
              await ordersService.updateStatus(orderId, "pending");
              toast.success("Order automatically moved to pending");
            } catch (e) {
              // ignore
            }
          }
        } catch (e: any) {
          toast.error("Failed to record initial payment: " + (e?.payload?.error || e.message));
        }
      }
      
      onClose();
    },
    onError: (e: any) => {
      const status = (e as any)?.status;
      if (status === 403) {
        toast.error("This Batch PO is closed. Only administrators can perform this action.");
      } else {
        toast.error(e?.payload?.error || e.message);
      }
    },
  });

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPoId) return toast.error("Select a Batch PO");
    if (!salesId) return toast.error("Choose a sales person");
    if (!customerId) return toast.error("Choose a customer");
    if (!items.some((i) => i.product_id && i.qty > 0))
      return toast.error("Add at least one item");
    if (Number(paymentAmount) > 0) {
      if (!paymentBankId) return toast.error("Select bank account for payment");
      if (!paymentType) return toast.error("Select payment type");
    }
    create.mutate();
  };

  const selectedSalesObj = users.data?.data?.find((u) => u.id === salesId);
  const selectedCustomerObj = customers.data?.data?.find((c) => c.id === customerId);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="w-[90vw] max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-xl">Buat Pesanan Baru</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lengkapi informasi pesanan, pengiriman, dan item untuk membuat quotation/order baru.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-order-form" onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* ── KOLOM KIRI (38% / 4 Cols): Informasional & Header Order ── */}
            <div className="lg:col-span-4 space-y-4">
              {/* Card 1: Batch PO, Sales, Customer */}
              <Card className="border-border/60">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Metadata Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  {/* Batch PO */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Batch PO <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={batchPoId}
                      onValueChange={setBatchPoId}
                      disabled={activeBatchPOs.isLoading}
                    >
                      <SelectTrigger className={`h-9 text-xs ${!batchPoId ? "border-destructive/50" : ""}`}>
                        <SelectValue
                          placeholder={
                            activeBatchPOs.isLoading ? "Loading batches…" : "Select an active Batch PO"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBatchPOs.data?.data?.length === 0 && (
                          <div className="px-2 py-3 text-xs text-muted-foreground">
                            No active Batch POs available.
                          </div>
                        )}
                        {activeBatchPOs.data?.data?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <span className="font-medium text-xs">{b.name}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground capitalize">— {b.status}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isBatchPOClosed && (
                      <p className="text-[11px] text-destructive mt-1">
                        {currentUserRole === "owner"
                          ? "⚠ This Batch PO is closed. You have owner access to proceed."
                          : "This Batch PO is closed. Only administrators can add orders."}
                      </p>
                    )}
                  </div>

                  {/* Sales Person (Searchable Combobox) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sales Person <span className="text-destructive">*</span></Label>
                    {isSales ? (
                      <Input
                        value={currentUserDetail.data?.data?.name || user?.name || "Your Account"}
                        disabled
                        className="h-9 text-xs bg-muted text-muted-foreground cursor-not-allowed"
                      />
                    ) : (
                      <Popover open={salesPopoverOpen} onOpenChange={setSalesPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={salesPopoverOpen}
                            className="w-full h-9 px-3 justify-between text-xs font-normal"
                          >
                            {selectedSalesObj
                              ? `${selectedSalesObj.name} ${selectedSalesObj.role ? `(${selectedSalesObj.role})` : ""}`
                              : "Search & select sales..."}
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Cari nama sales..." className="h-8 text-xs" />
                            <CommandList>
                              <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
                                Sales tidak ditemukan.
                              </CommandEmpty>
                              <CommandGroup>
                                {users.data?.data?.map((u) => (
                                  <CommandItem
                                    key={u.id}
                                    value={u.name}
                                    onSelect={() => {
                                      setSalesId(u.id);
                                      setCustomerId("");
                                      setSalesPopoverOpen(false);
                                    }}
                                    className="text-xs cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3.5 w-3.5",
                                        salesId === u.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span>{u.name}</span>
                                    {u.role && <span className="ml-auto text-[10px] text-muted-foreground">{u.role}</span>}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Customer (Searchable Combobox + Quick Create) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Customer <span className="text-destructive">*</span></Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[11px] text-primary hover:text-primary"
                        disabled={!salesId}
                        onClick={() => setNewCustomerOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Customer Baru
                      </Button>
                    </div>

                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerPopoverOpen}
                          disabled={!salesId}
                          className="w-full h-9 px-3 justify-between text-xs font-normal"
                        >
                          {!salesId
                            ? "Pilih sales terlebih dahulu"
                            : selectedCustomerObj
                            ? `${selectedCustomerObj.name} ${selectedCustomerObj.phone ? `· ${selectedCustomerObj.phone}` : ""}`
                            : "Cari customer..."}
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cari nama atau telepon customer..." className="h-8 text-xs" />
                          <CommandList>
                            <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
                              Customer tidak ditemukan.
                            </CommandEmpty>
                            <CommandGroup>
                              {customers.data?.data?.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={`${c.name} ${c.phone || ""}`}
                                  onSelect={() => {
                                    setCustomerId(c.id);
                                    setCustomerPopoverOpen(false);
                                  }}
                                  className="text-xs cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3.5 w-3.5",
                                      customerId === c.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{c.name}</span>
                                    {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Pengiriman */}
              <Card className="border-border/60">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pengiriman & Kurir
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Kurir</Label>
                    <Input
                      placeholder="JNE, J&T, Self Pick-up"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ongkos Kirim</Label>
                    <CurrencyInput
                      placeholder="0"
                      value={shippingCost}
                      onChange={(val) => setShippingCost(val)}
                      className="h-8 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 2.5: Transaksi Pajak / Pengadaan Dinas */}
              <Card className="border-border/60">
                <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Transaksi Pajak / Pengadaan Dinas
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">Aktifkan untuk PPN 12% & PPh 22</p>
                  </div>
                  <Switch
                    id="is-taxable-toggle-create"
                    checked={isTaxable}
                    onCheckedChange={(checked) => setIsTaxable(checked)}
                  />
                </CardHeader>
                {isTaxable && (
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Rate PPN (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={taxPpnRate}
                          onChange={(e) => setTaxPpnRate(e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                          placeholder="12.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Rate PPh 22 (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={taxPph22Rate}
                          onChange={(e) => setTaxPph22Rate(e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                          placeholder="1.50"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200/50">
                      💡 DPP PPN dihitung otomatis: Subtotal / 1.09
                    </p>
                  </CardContent>
                )}
              </Card>

              {/* Card 3: Direct Payment (Collapsible Accordion) */}
              <Card className="border-border/60">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="direct-payment" className="border-none">
                    <AccordionTrigger className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline hover:bg-muted/30 rounded-t-xl">
                      Direct Payment (Optional)
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-1 space-y-3">
                      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg text-xs">
                        <div>
                          <div className="text-muted-foreground text-[10px]">Total Order</div>
                          <div className="font-semibold">{formatIDR(total)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[10px]">Bayar Awal</div>
                          <div className="font-semibold text-emerald-600">
                            {formatIDR(Number(paymentAmount) || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[10px]">Sisa Piutang</div>
                          <div className={`font-semibold ${total - (Number(paymentAmount) || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatIDR(total - (Number(paymentAmount) || 0))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Rekening Bank (Sales/Global)</Label>
                        <Select
                          value={paymentBankId}
                          onValueChange={setPaymentBankId}
                          disabled={(!salesId && !globalBankAccounts.data?.data?.length) || bankAccounts.isLoading || globalBankAccounts.isLoading}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue
                              placeholder={
                                (!salesId && !globalBankAccounts.data?.data?.length)
                                  ? "Pilih sales terlebih dahulu"
                                  : bankAccounts.isLoading || globalBankAccounts.isLoading
                                    ? "Memuat bank…"
                                    : "Pilih rekening penerima"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {globalBankAccounts.data?.data && globalBankAccounts.data.data.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[11px]">Global / Perusahaan</SelectLabel>
                                {globalBankAccounts.data.data.map((ba) => (
                                  <SelectItem key={ba.id} value={ba.id} className="text-xs">
                                    {ba.bank_name} — {ba.account_number} ({ba.account_name})
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {bankAccounts.data?.data && bankAccounts.data.data.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-[11px]">Sales</SelectLabel>
                                {bankAccounts.data.data.map((ba) => (
                                  <SelectItem key={ba.id} value={ba.id} className="text-xs">
                                    {ba.bank_name} — {ba.account_number} ({ba.account_name})
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nominal Bayar</Label>
                          <CurrencyInput
                            placeholder="0"
                            value={paymentAmount}
                            onChange={(val) => setPaymentAmount(val)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipe Pembayaran</Label>
                          <Select value={paymentType} onValueChange={setPaymentType}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Tipe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dp" className="text-xs">DP</SelectItem>
                              <SelectItem value="settlement" className="text-xs">SETTLEMENT</SelectItem>
                              <SelectItem value="installment" className="text-xs">INSTALLMENT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Nomor Referensi / TRX (Opsional)</Label>
                        <Input
                          placeholder="e.g. TRX-12345"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </div>

            {/* ── KOLOM KANAN (62% / 6 Cols): Items List & Total Summary ── */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              <Card className="border-border/60 flex-1 flex flex-col">
                <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Daftar Item Pesanan
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2 gap-1"
                    onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0, details: [] }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Item
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1">
                  {items.map((it, idx) => (
                    <div key={idx} className="space-y-3 rounded-lg border bg-card p-3 shadow-xs">
                      <div className="grid gap-2 sm:grid-cols-[1fr_80px_140px_auto] items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Produk / Kategori</Label>
                          <Select
                            value={it.product_id}
                            onValueChange={(v) => {
                              const p = products.data?.data?.find((x) => x.id === v);
                              updateItem(idx, { product_id: v, price: p?.base_price ?? it.price });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Pilih produk..." />
                            </SelectTrigger>
                            <SelectContent>
                              {products.data?.data?.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {p.name} — {formatIDR(p.base_price)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Harga Satuan</Label>
                          <CurrencyInput
                            value={it.price || ""}
                            onChange={(val) => updateItem(idx, { price: Number(val) || 0 })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <ItemDetailsFields
                        item={it}
                        isQuotation={false}
                        hideSpec={true}
                        onChange={(patch) => updateItem(idx, patch)}
                      />
                    </div>
                  ))}
                </CardContent>

                {/* Sticky/Bottom Summary Panel */}
                <div className="border-t bg-muted/10 p-4 space-y-1.5 text-xs">
                  {isTaxable ? (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal (Real Goods)</span>
                        <span className="tabular-nums font-medium">{formatIDR(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>DPP PPN (Subtotal / 1.09)</span>
                        <span className="tabular-nums font-mono text-[11px]">{formatIDR(dppPpn)}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                        <span>PPN ({ppnRateNum.toFixed(2)}%)</span>
                        <span className="tabular-nums">+ {formatIDR(ppnAmount)}</span>
                      </div>
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                        <span>PPh 22 ({pph22RateNum.toFixed(2)}%)</span>
                        <span className="tabular-nums">- {formatIDR(pph22Amount)}</span>
                      </div>
                      {shipping > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Ongkos Kirim</span>
                          <span className="tabular-nums">{formatIDR(shipping)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2 space-y-1.5">
                        <div className="flex justify-between font-bold text-sm text-foreground">
                          <span>Pagu Belanja (Invoice Gross ke Dinas)</span>
                          <span className="tabular-nums text-primary text-base">{formatIDR(paguBelanja)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                          <span>Yang Diterima Penyedia (Net Cash In)</span>
                          <span className="tabular-nums text-sm font-extrabold">{formatIDR(netCashIn)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal Items</span>
                        <span className="tabular-nums">{formatIDR(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ongkos Kirim</span>
                        <span className="tabular-nums">{formatIDR(shipping)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t mt-1.5">
                        <span>Total Keseluruhan</span>
                        <span className="tabular-nums text-primary text-base">{formatIDR(total)}</span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </form>
        </div>

        <DialogFooter className="px-6 py-3 border-t shrink-0 bg-card">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            size="sm"
            form="create-order-form"
            disabled={create.isPending || !batchPoId || isFormLocked}
          >
            {create.isPending ? "Proses..." : "Buat Pesanan Baru"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <QuickCreateCustomerDialog
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        salesId={salesId}
        onCreated={(c) => {
          setCustomerId(c.id);
          if (c.sales_id) setSalesId(c.sales_id);
          qc.invalidateQueries({ queryKey: ["customers"] });
        }}
      />
    </Dialog>
  );
}

export function UpdateOrderDialog({
  orderId,
  open,
  onClose,
  type,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  type: "order" | "quotation";
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId!),
    enabled: !!orderId,
  });
  const products = useQuery({
    queryKey: ["products", { page: 1, limit: 100 }],
    queryFn: () => productsService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  const order = data?.data;
  const isQuotation = type === "quotation";

  const [form, setForm] = useState({
    courier_name: "",
    shipping_cost: 0,
    shipping_address: "",
    notes: "",
    terms_conditions: "",
  });
  const [isTaxable, setIsTaxable] = useState(false);
  const [taxPpnRate, setTaxPpnRate] = useState<number | "">(12.00);
  const [taxPph22Rate, setTaxPph22Rate] = useState<number | "">(1.50);

  const [items, setItems] = useState<Item[]>([]);
  const [activeItems, setActiveItems] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (order && open) {
      setForm({
        courier_name: order.courier_name || "",
        shipping_cost: order.shipping_cost || 0,
        shipping_address: order.shipping_address || "",
        notes: order.notes || "",
        terms_conditions: order.terms_conditions || "",
      });
      setIsTaxable(order.is_taxable ?? false);
      setTaxPpnRate(order.tax_ppn_rate ?? 12.00);
      setTaxPph22Rate(order.tax_pph22_rate ?? 1.50);
      setDeletedItemIds([]);
      if (order.items) {
        const loadedItems = order.items.map((i: any, idx: number) => ({
          id: i.id || `item-${idx}`,
          product_id: i.product_id,
          fabric_id: i.fabric_id || undefined,
          fabric_color_id: i.fabric_color_id || undefined,
          custom_name: i.custom_name ?? "",
          qty: i.qty,
          price: i.price,
          details: parseDetailsFromBackend(i.details),
        }));
        setItems(loadedItems);
        setActiveItems([]);
      }
    } else if (!open) {
      setItems([]);
      setActiveItems([]);
      setDeletedItemIds([]);
      setIsTaxable(false);
      setTaxPpnRate(12.00);
      setTaxPph22Rate(1.50);
    }
  }, [order, open]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleAddItem = () => {
    const tempId = `temp-${Date.now()}`;
    const newItem: Item = {
      id: tempId,
      product_id: "",
      custom_name: "",
      qty: 1,
      price: 0,
      details: [],
    };
    setItems((arr) => [...arr, newItem]);
    setActiveItems([tempId]);

    setTimeout(() => {
      const el = document.getElementById(`item-accordion-${tempId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      const selectTrigger = document.getElementById(`select-trigger-${tempId}`);
      if (selectTrigger) {
        selectTrigger.focus();
      }
    }, 100);
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = Number(form.shipping_cost || 0);
  const ppnRateNum = Number(taxPpnRate || 0);
  const pph22RateNum = Number(taxPph22Rate || 0);

  const dppPpn = isTaxable ? subtotal / 1.09 : 0;
  const ppnAmount = isTaxable ? dppPpn * (ppnRateNum / 100) : 0;
  const pph22Amount = isTaxable ? dppPpn * (pph22RateNum / 100) : 0;

  const paguBelanja = isTaxable ? subtotal + shipping + ppnAmount : subtotal + shipping;
  const netCashIn = isTaxable ? paguBelanja - (ppnAmount + pph22Amount) : subtotal + shipping;
  const total = isTaxable ? paguBelanja : subtotal + shipping;

  const updateMut = useMutation({
    mutationFn: async (body: any) => {
      if (order && deletedItemIds.length > 0) {
        await Promise.all(
          deletedItemIds.map((itemId) => ordersService.deleteItem(order.id, itemId)),
        );
      }

      await Promise.all(
        body.items.map((it: any) => {
          const details = buildItemDetails(it);
          const itemBody = {
            product_id: it.product_id,
            fabric_id: it.fabric_id || undefined,
            fabric_color_id: it.fabric_color_id || undefined,
            custom_name: it.custom_name || undefined,
            qty: it.qty,
            price: it.price,
            details: details || undefined,
          };

          if (it.id && !it.id.startsWith("temp-") && order) {
            return ordersService.updateItem(order.id, it.id, itemBody);
          }

          return ordersService.addItem(orderId!, itemBody);
        }),
      );

      await ordersService.update(orderId!, {
        customer_id: body.customer_id,
        sales_id: body.sales_id,
        items: body.items.map(({ id, ...rest }: any) => rest),
        courier_name: body.courier_name,
        shipping_cost: body.shipping_cost,
        shipping_address: body.shipping_address,
        notes: body.notes,
        terms_conditions: body.terms_conditions,
        is_taxable: body.is_taxable,
        tax_ppn_rate: body.tax_ppn_rate,
        tax_pph22_rate: body.tax_pph22_rate,
      });
    },
    onSuccess: () => {
      toast.success(isQuotation ? "Quotation updated" : "Order updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: any) => {
      const rawMsg = e?.response?.data?.error || e?.payload?.error || e?.response?.data?.message || e?.message;
      toast.error(translateOrderErrorMessage(rawMsg));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    updateMut.mutate({
      customer_id: order.customer_id,
      sales_id: order.sales_id || "",
      items: items
        .filter((i) => i.product_id && i.qty > 0)
        .map((i) => ({
          id: i.id,
          product_id: i.product_id,
          custom_name: i.custom_name || undefined,
          qty: i.qty,
          price: i.price,
          details: {
            parts: buildItemDetails(i) || [],
            bordir: i.bordir,
            benang: i.benang,
            jahitan: i.jahitan
          },
        })),
      courier_name: form.courier_name || undefined,
      shipping_cost: Number(form.shipping_cost) || 0,
      shipping_address: form.shipping_address || undefined,
      notes: form.notes || undefined,
      terms_conditions: isQuotation ? (form.terms_conditions || undefined) : undefined,
      is_taxable: isTaxable,
      tax_ppn_rate: isTaxable ? ppnRateNum : undefined,
      tax_pph22_rate: isTaxable ? pph22RateNum : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Update {isQuotation ? "Quotation" : "Order"}</DialogTitle>
          <DialogDescription>
            {order?.order_number ? `Editing: ${order.order_number}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        <form id="shipping-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading || !order ? (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex flex-row items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Items (Click to edit details)</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>
                <Accordion
                  type="multiple"
                  value={activeItems}
                  onValueChange={setActiveItems}
                  className="w-full space-y-3"
                >
                  {items.map((it, idx) => {
                    const itemId = String(it.id || `item-${idx}`);
                    return (
                      <AccordionItem
                        value={itemId}
                        key={itemId}
                        id={`item-accordion-${itemId}`}
                        className="border rounded-md px-4 bg-muted/10"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex flex-col items-start text-left w-full gap-1 pr-4">
                            <div className="font-medium text-sm">
                              {products.data?.data?.find((p) => p.id === it.product_id)?.name || "Select Product"}
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground font-normal">
                              <span>Qty: {it.qty}</span>
                              <span>Price: {formatIDR(it.price)}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4 space-y-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_80px_120px_auto] items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">Product</Label>
                              <Select
                                value={it.product_id}
                                onValueChange={(v) => {
                                  const p = products.data?.data?.find((x) => x.id === v);
                                  updateItem(idx, { product_id: v, price: p?.base_price ?? it.price });
                                }}
                              >
                                <SelectTrigger id={`select-trigger-${itemId}`}>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.data?.data?.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} — {formatIDR(p.base_price)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Price</Label>
                              <Input
                                type="number"
                                min={0}
                                value={it.price}
                                onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setItems((arr) => arr.filter((_, i) => i !== idx));
                                setActiveItems((arr) => arr.filter((val) => val !== itemId));
                                if (it.id && !it.id.startsWith("temp-")) {
                                  setDeletedItemIds((ids) => [...ids, it.id!]);
                                }
                              }}
                              disabled={items.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ItemDetailsFields
                            item={it}
                            isQuotation={isQuotation}
                            onChange={(patch) => updateItem(idx, patch)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>

              {/* Transaksi Pajak / Instansi Pemerintah Card */}
              <Card className="border-border/60">
                <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Transaksi Pajak / Pengadaan Dinas
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">Aktifkan untuk PPN 12% & PPh 22</p>
                  </div>
                  <Switch
                    id="is-taxable-toggle-update"
                    checked={isTaxable}
                    onCheckedChange={(checked) => setIsTaxable(checked)}
                  />
                </CardHeader>
                {isTaxable && (
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Rate PPN (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={taxPpnRate}
                          onChange={(e) => setTaxPpnRate(e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                          placeholder="12.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Rate PPh 22 (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={taxPph22Rate}
                          onChange={(e) => setTaxPph22Rate(e.target.value === "" ? "" : Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                          placeholder="1.50"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200/50">
                      💡 DPP PPN dihitung otomatis: Subtotal / 1.09
                    </p>
                  </CardContent>
                )}
              </Card>

              {/* Financial Summary Preview */}
              <div className="rounded-lg border bg-muted/10 p-4 space-y-1.5 text-xs">
                {isTaxable ? (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal (Real Goods)</span>
                      <span className="tabular-nums font-medium">{formatIDR(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>DPP PPN (Subtotal / 1.09)</span>
                      <span className="tabular-nums font-mono text-[11px]">{formatIDR(dppPpn)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                      <span>PPN ({ppnRateNum.toFixed(2)}%)</span>
                      <span className="tabular-nums">+ {formatIDR(ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                      <span>PPh 22 ({pph22RateNum.toFixed(2)}%)</span>
                      <span className="tabular-nums">- {formatIDR(pph22Amount)}</span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ongkos Kirim</span>
                        <span className="tabular-nums">{formatIDR(shipping)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2 space-y-1.5">
                      <div className="flex justify-between font-bold text-sm text-foreground">
                        <span>Pagu Belanja (Invoice Gross ke Dinas)</span>
                        <span className="tabular-nums text-primary text-base">{formatIDR(paguBelanja)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                        <span>Yang Diterima Penyedia (Net Cash In)</span>
                        <span className="tabular-nums text-sm font-extrabold">{formatIDR(netCashIn)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal Items</span>
                      <span className="tabular-nums">{formatIDR(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ongkos Kirim</span>
                      <span className="tabular-nums">{formatIDR(shipping)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t mt-1.5">
                      <span>Total Keseluruhan</span>
                      <span className="tabular-nums text-primary text-base">{formatIDR(total)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="shipping-form" disabled={updateMut.isPending || !order}>
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


const paymentBadgeVariant: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  unpaid: "bg-rose-100 text-rose-800 border-rose-200",
  pending: "bg-purple-100 text-purple-800 border-purple-200",
};

function PaymentStatusBadge({ status, onClick }: { status?: string; onClick?: () => void }) {
  const { t } = useLanguage();
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const key = `payment_status.${status.toLowerCase()}` as any;
  const label = t(key, status);
  const cls = paymentBadgeVariant[status.toLowerCase()] ?? "bg-muted text-foreground border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? "+ Record Payment" : undefined}
      className={cn(
        `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${cls}`,
        onClick && "hover:ring-2 hover:ring-primary/40 hover:shadow-sm cursor-pointer"
      )}
    >
      {label}
    </button>
  );
}

const quickFilterTabs: { labelKey: TranslationKey; defaultLabel: string; value: string }[] = [
  { labelKey: "status.all", defaultLabel: "Semua Order", value: "" },
  { labelKey: "order_status.quotation", defaultLabel: "Quotation", value: "quotation" },
  { labelKey: "order_status.pending", defaultLabel: "Menunggu (Pending)", value: "pending" },
  { labelKey: "order_status.production", defaultLabel: "Produksi", value: "production" },
  { labelKey: "order_status.ready", defaultLabel: "Siap Kirim", value: "ready" },
  { labelKey: "order_status.completed", defaultLabel: "Selesai", value: "completed" },
];

function OrdersPage() {
  const { t } = useLanguage();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const limit = 10;
  const qc = useQueryClient();
  const { user, isSales, isOwner } = useAuth();

  const [editOrder, setEditOrder] = useState<{ id: string; type: "order" | "quotation" } | null>(null);
  const [createModeOpen, setCreateModeOpen] = useState(false);
  const [recordPaymentOrder, setRecordPaymentOrder] = useState<import("@/lib/types").Order | null>(null);

  // Local input state for debounced search box
  const [searchInput, setSearchInput] = useState(search.search);
  useEffect(() => {
    setSearchInput(search.search);
  }, [search.search]);

  // Debounce the search input -> URL
  useEffect(() => {
    if (searchInput === search.search) return;
    const t = setTimeout(() => {
      navigate({
        search: (prev: typeof search) => ({ ...prev, search: searchInput, page: 1 }),
        replace: true,
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const setFilter = (patch: Partial<typeof search>) => {
    navigate({
      search: (prev: typeof search) => ({ ...prev, ...patch, page: 1 }),
      replace: true,
    });
  };

  const setPage = (p: number) =>
    navigate({ search: (prev: typeof search) => ({ ...prev, page: p }), replace: true });

  const queryParams = {
    page: search.page,
    limit,
    search: search.search || undefined,
    order_status: search.order_status || undefined,
    payment_status: search.payment_status || undefined,
    start_date: search.start_date || undefined,
    end_date: search.end_date || undefined,
    sales_id: search.sales_id || undefined,
    batch_po_id: search.batch_po_id || undefined,
  };

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["orders", queryParams],
    queryFn: () => ordersService.list(queryParams),
  });

  // Query for counts across status tabs (with same search filters except order_status)
  const countQueryParams = {
    ...queryParams,
    page: 1,
    limit: 1000,
    order_status: undefined,
  };

  const { data: countData } = useQuery({
    queryKey: ["orders", "counts", countQueryParams],
    queryFn: () => ordersService.list(countQueryParams),
  });

  const allFilteredOrders = countData?.data ?? [];
  const statusCounts = allFilteredOrders.reduce<Record<string, number>>((acc, o) => {
    const st = o.order_status?.toLowerCase();
    if (st) {
      acc[st] = (acc[st] || 0) + 1;
    }
    return acc;
  }, {});

  const { data: usersData } = useQuery({
    queryKey: ["users", "sales"],
    queryFn: () => usersService.list({ role: "sales", limit: 100 }),
  });
  const salesUsers = usersData?.data ?? [];

  const { data: allBatchPOsData } = useQuery({
    queryKey: ["batch-pos", "list", { limit: 100 }],
    queryFn: () => batchPosService.list({ limit: 100 }),
  });
  const allBatchPOs = allBatchPOsData?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersService.delete(id),
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

  const orders = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const page = search.page;
  const hasNextPage = data?.paging?.total_page ? page < data.paging.total_page : orders.length === limit;

  const startDate = search.start_date ? new Date(search.start_date) : undefined;
  const endDate = search.end_date ? new Date(search.end_date) : undefined;

  const activeFilterCount =
    (search.order_status ? 1 : 0) +
    (search.payment_status ? 1 : 0) +
    (search.sales_id ? 1 : 0) +
    (search.batch_po_id ? 1 : 0) +
    (search.start_date || search.end_date ? 1 : 0);

  const hasAnyFilter =
    !!search.search ||
    !!search.order_status ||
    !!search.payment_status ||
    !!search.sales_id ||
    !!search.batch_po_id ||
    !!search.start_date ||
    !!search.end_date;

  const clearAll = () =>
    navigate({
      search: () => ({
        page: 1,
        search: "",
        order_status: "",
        payment_status: "",
        start_date: "",
        end_date: "",
        sales_id: "",
        batch_po_id: "",
      }),
      replace: true,
    });

  const selectedBatchPO = allBatchPOs.find((b) => b.id === search.batch_po_id);
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  // Helper to derive month-year key for a batch PO
  const getBatchMonthKey = (b: typeof allBatchPOs[0]) => {
    if (b.target_month && b.target_year) {
      return `${b.target_year}-${String(b.target_month).padStart(2, "0")}`;
    }
    if (b.start_date) {
      const d = new Date(b.start_date);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    }
    return "other";
  };

  // Group unique months available from all batch POs
  const availableMonthsMap = new Map<string, string>();
  allBatchPOs.forEach((b) => {
    const key = getBatchMonthKey(b);
    if (key !== "other") {
      const [year, monthStr] = key.split("-");
      const mIdx = parseInt(monthStr, 10) - 1;
      const label = `${monthNames[mIdx]} ${year}`;
      availableMonthsMap.set(key, label);
    }
  });

  const availableMonths = Array.from(availableMonthsMap.entries()).map(([key, label]) => ({ key, label }));

  // State / Derived active month selection
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    if (selectedBatchPO) {
      return getBatchMonthKey(selectedBatchPO);
    }
    return search.batch_po_id === "all" ? "all" : "active";
  });

  // Keep selectedMonthKey in sync with search.batch_po_id if changed externally or by reset
  useEffect(() => {
    if (search.batch_po_id === "" || !search.batch_po_id) {
      setSelectedMonthKey("active");
    } else if (search.batch_po_id === "all") {
      setSelectedMonthKey("all");
    } else if (selectedBatchPO) {
      setSelectedMonthKey(getBatchMonthKey(selectedBatchPO));
    }
  }, [search.batch_po_id, selectedBatchPO]);

  // Filter batch POs for Dropdown 2 based on selectedMonthKey
  const filteredBatchPOsForDropdown = allBatchPOs.filter((b) => {
    if (selectedMonthKey === "active") return b.status === "active";
    if (selectedMonthKey === "all") return true;
    return getBatchMonthKey(b) === selectedMonthKey;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track every order from intake through delivery.
          </p>
        </div>

        {/* Top Filter Controls: Header Batch PO Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Bulan PO:</Label>
            <Select
              value={selectedMonthKey}
              onValueChange={(val) => {
                setSelectedMonthKey(val);
                if (val === "active") {
                  setFilter({ batch_po_id: "" });
                } else if (val === "all") {
                  setFilter({ batch_po_id: "all" });
                } else {
                  // Pick first PO from this month or clear to all
                  const match = allBatchPOs.find((b) => getBatchMonthKey(b) === val);
                  setFilter({ batch_po_id: match ? match.id : "all" });
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[170px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Batch PO Aktif (Default)</SelectItem>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Batch PO:</Label>
            <Select
              value={search.batch_po_id || (selectedMonthKey === "active" ? "active" : "all")}
              onValueChange={(v) => {
                if (v === "active") setFilter({ batch_po_id: "" });
                else setFilter({ batch_po_id: v });
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[200px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {selectedMonthKey === "active" && (
                  <SelectItem value="active">Batch PO Aktif (Default)</SelectItem>
                )}
                <SelectItem value="all">Semua Batch PO</SelectItem>
                {filteredBatchPOsForDropdown.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span>{b.name}</span>
                    <span className="ml-1 text-[10px] text-muted-foreground capitalize">({b.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setCreateModeOpen(true)} className="h-9">
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {/* Quick Filter Tabs (Order Status) */}
      <div className="flex items-center gap-1 border-b pb-1 overflow-x-auto no-scrollbar">
        {quickFilterTabs.map((tab) => {
          const isActive = (search.order_status || "") === tab.value;
          const count = tab.value === "" 
            ? allFilteredOrders.length 
            : (statusCounts[tab.value] || 0);

          return (
            <button
              key={tab.value}
              onClick={() => setFilter({ order_status: tab.value })}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <span>{t(tab.labelKey, tab.defaultLabel)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Order List</CardTitle>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:min-w-[420px] sm:justify-end flex-wrap">
              <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by order number…"
                  className="pl-8 h-9"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Payment Status</Label>
                    <Select
                      value={search.payment_status || "all"}
                      onValueChange={(v) =>
                        setFilter({ payment_status: v === "all" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("status.all", "Semua Status Bayar")}</SelectItem>
                        {paymentStatusList.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`payment_status.${s}` as any, s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Sales</Label>
                    <Select
                      value={search.sales_id || "all"}
                      onValueChange={(v) =>
                        setFilter({ sales_id: v === "all" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Sales</SelectItem>
                        {salesUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="capitalize">
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start font-normal h-9",
                              !startDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {startDate ? format(startDate, "yyyy-MM-dd") : "Start"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(d) =>
                              setFilter({
                                start_date: d ? format(d, "yyyy-MM-dd") : "",
                              })
                            }
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start font-normal h-9",
                              !endDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {endDate ? format(endDate, "yyyy-MM-dd") : "End"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(d) =>
                              setFilter({
                                end_date: d ? format(d, "yyyy-MM-dd") : "",
                              })
                            }
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      disabled={!hasAnyFilter}
                    >
                      Clear filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              {hasAnyFilter && (
                <Button variant="ghost" size="sm" className="h-9" onClick={clearAll}>
                  <X className="h-4 w-4" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Batch PO</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Total Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-destructive py-8">
                    {(error as Error)?.message ?? "Failed to load orders"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    <div className="space-y-1">
                      <p className="font-medium">No orders found</p>
                      <p className="text-xs">
                        {hasAnyFilter
                          ? "No orders match your criteria. Try adjusting filters."
                          : "Create your first order to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o) => {
                const canEdit = !isSales || (o.order_status === "quotation" || o.order_status === "pending");

                return (
                  <TableRow key={o.id} className={isFetching ? "opacity-70" : ""}>
                    <TableCell className="font-mono text-xs">
                      {o.order_number ?? o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.batch_po?.name ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
                          {o.batch_po.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {o.sales?.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {o.customer?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(o.created_at)}
                    </TableCell>
                    <TableCell className="text-center font-medium text-xs">
                      {o.total_qty !== undefined ? `${o.total_qty} pcs` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.order_status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(o.total_amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <PaymentStatusBadge status={o.payment_status} onClick={() => setRecordPaymentOrder(o)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="+ Payment (Record Payment)"
                          onClick={() => setRecordPaymentOrder(o)}
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Quick Update"
                            onClick={() => setEditOrder({ id: o.id, type: o.order_status === "quotation" ? "quotation" : "order" })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View">
                          <Link to="/orders/$orderId" params={{ orderId: o.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete"
                            onClick={() => {
                              if (confirm("Delete this order?")) deleteMut.mutate(o.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => setPage(page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>


      <UpdateOrderDialog
        orderId={editOrder?.id ?? null}
        open={!!editOrder}
        onClose={() => setEditOrder(null)}
        type={editOrder?.type ?? "order"}
      />

      <CreateOrderDialog
        open={createModeOpen}
        onClose={() => setCreateModeOpen(false)}
      />

      <AddPaymentDialog
        orderId={recordPaymentOrder?.id ?? null}
        salesId={recordPaymentOrder?.sales_id}
        remaining={
          recordPaymentOrder
            ? Math.max(
                0,
                recordPaymentOrder.total_amount -
                  (recordPaymentOrder.payments || [])
                    .filter((p) => (p.status || "").toLowerCase() === "verified")
                    .reduce((acc, p) => acc + (p.amount || 0), 0)
              )
            : 0
        }
        currentStatus={recordPaymentOrder?.order_status}
        orderNumber={recordPaymentOrder?.order_number}
        open={!!recordPaymentOrder}
        onClose={() => setRecordPaymentOrder(null)}
      />
    </div>
  );
}
