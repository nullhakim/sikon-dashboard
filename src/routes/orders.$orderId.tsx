import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Plus,
  FileDown,
  Printer,
  Trash2,
  Info,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { AddPaymentDialog } from "@/components/AddPaymentDialog";

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
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  ordersService,
  paymentsService,
  bankAccountsService,
  productsService,
  specTemplatesService,
} from "@/lib/services";
import { formatIDR, formatDate, formatDateISO, datetimeLocalToISO, translateOrderErrorMessage } from "@/lib/format";
import { generateInvoicePDF, generateKwitansiPDF } from "@/lib/invoice";
import { printSpkSuratJalan } from "@/lib/quotation";
import { QuotationPdfDialog } from "@/components/QuotationPdfDialog";
import { Item, buildItemDetails, ItemDetailsFields, parseDetailsFromBackend } from "@/routes/orders.index";
import { StatusBadge } from "@/routes/payments";
export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Detail — SIKOn ERP" },
      { name: "description", content: "View order details, items, and payment history." },
    ],
  }),
  component: OrderDetailPage,
});

const paymentTypeList = ["dp", "settlement", "installment"] as const;

const statusVariant: Record<string, string> = {
  quotation: "bg-violet-100 text-violet-800 border-violet-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  production: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-cyan-100 text-cyan-800 border-cyan-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  canceled: "bg-rose-100 text-rose-800 border-rose-200",
};

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  unpaid: "bg-rose-100 text-rose-800 border-rose-200",
};

function Badge({ value, map }: { value?: string; map: Record<string, string> }) {
  const v = (value ?? "—").toLowerCase();
  const cls = map[v] ?? "bg-muted text-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {value ?? "—"}
    </span>
  );
}

const ORDER_STAGES = [
  { id: "quotation", label: "Quotation" },
  { id: "pending", label: "Pending" },
  { id: "production", label: "Production" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
];

function OrderLifecycleStepper({ currentStatus }: { currentStatus?: string }) {
  const normalizedStatus = (currentStatus || "quotation").toLowerCase();
  const isCanceled = normalizedStatus === "canceled";

  const currentIndex = ORDER_STAGES.findIndex((s) => s.id === normalizedStatus);

  return (
    <div className="w-full py-2">
      {isCanceled ? (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-800 text-sm font-medium">
          <Trash2 className="h-5 w-5 shrink-0" />
          <span>Pesanan ini telah dibatalkan (Canceled).</span>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full overflow-x-auto pb-1">
          {ORDER_STAGES.map((stage, idx) => {
            const isCompleted = currentIndex >= 0 && idx < currentIndex;
            const isCurrent = currentIndex >= 0 && idx === currentIndex;
            const isUpcoming = currentIndex < 0 || idx > currentIndex;

            return (
              <div key={stage.id} className="flex items-center flex-1 min-w-[120px] last:flex-none">
                {/* Step Circle & Label */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors border",
                      isCompleted && "bg-emerald-600 text-white border-emerald-600 shadow-sm",
                      isCurrent && "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-md",
                      isUpcoming && "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-xs font-medium capitalize whitespace-nowrap",
                        isCurrent && "font-bold text-foreground",
                        isCompleted && "text-emerald-700 font-semibold",
                        isUpcoming && "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-primary font-medium leading-none mt-0.5">Aktif</span>
                    )}
                  </div>
                </div>

                {/* Connecting Line */}
                {idx < ORDER_STAGES.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 min-w-[24px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        idx < currentIndex ? "bg-emerald-500" : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function UpdateShippingDialog({
  order,
  open,
  onClose,
}: {
  order: any;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isQuotation = (order?.order_status || "").toLowerCase() === "quotation";

  const [form, setForm] = useState({
    courier_name: "",
    shipping_cost: 0,
    shipping_address: "",
    notes: "",
    terms_conditions: "",
  });

  useEffect(() => {
    if (order && open) {
      setForm({
        courier_name: order.courier_name || "",
        shipping_cost: order.shipping_cost || 0,
        shipping_address: order.shipping_address || "",
        notes: order.notes || "",
        terms_conditions: order.terms_conditions || "",
      });
    }
  }, [order, open]);

  const updateMut = useMutation({
    mutationFn: (body: any) => ordersService.update(order.id, body),
    onSuccess: () => {
      toast.success("Shipping & Notes updated");
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;

    updateMut.mutate({
      customer_id: order.customer_id,
      sales_id: order.sales_id || "",
      items: order.items?.map((i: any) => ({
        product_id: i.product_id,
        qty: i.qty,
        price: i.price,
        details: i.details,
      })) || [],
      courier_name: form.courier_name || undefined,
      shipping_cost: Number(form.shipping_cost) || 0,
      shipping_address: form.shipping_address || undefined,
      notes: form.notes || undefined,
      terms_conditions: isQuotation ? (form.terms_conditions || undefined) : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Logistics & Notes</DialogTitle>
        </DialogHeader>
        <form id="shipping-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Courier</Label>
              <Input
                value={form.courier_name}
                onChange={(e) => setForm({ ...form, courier_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Shipping Cost</Label>
              <Input
                type="number"
                min={0}
                value={form.shipping_cost}
                onChange={(e) => setForm({ ...form, shipping_cost: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Order Note</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            {isQuotation && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Terms &amp; Conditions</Label>
                <Textarea
                  rows={3}
                  value={form.terms_conditions}
                  onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                />
              </div>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="shipping-form" disabled={updateMut.isPending}>
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateQuotationDialog({
  order,
  open,
  onClose,
}: {
  order: any;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const specTemplates = useQuery({
    queryKey: ["spec-templates", { limit: 100 }],
    queryFn: () => specTemplatesService.list({ page: 1, limit: 100 }),
    enabled: open,
  });
  const [form, setForm] = useState({
    terms_conditions: "",
    valid_until: "",
  });
  const [items, setItems] = useState<any[]>([]);
  const [activeItems, setActiveItems] = useState<string[]>([]);

  useEffect(() => {
    if (order && open) {
      setForm({
        terms_conditions: order.terms_conditions || "",
        valid_until: order.valid_until ? order.valid_until.slice(0, 10) : "",
      });
      if (order.items) {
        const loaded = order.items.map((i: any) => {
          let rawDetails = i.details;
          if (typeof rawDetails === "string") {
            try {
              rawDetails = JSON.parse(rawDetails);
            } catch {
              rawDetails = {};
            }
          }
          return {
            id: i.id,
            product_id: i.product_id,
            product_name: i.product_name || i.product?.name || "—",
            custom_name: i.custom_name ?? "",
            qty: i.qty,
            price: i.price,
            details: parseDetailsFromBackend(i.details),
            benang: rawDetails?.benang ?? rawDetails?.Benang ?? "",
            bordir: rawDetails?.bordir ?? rawDetails?.Bordir ?? "",
            jahitan: rawDetails?.jahitan ?? rawDetails?.Jahitan ?? "",
          };
        });
        setItems(loaded);
        setActiveItems([]);
      }
    } else if (!open) {
      setItems([]);
      setActiveItems([]);
    }
  }, [order, open, specTemplates.data?.data]);

  const updateItem = (idx: number, patch: any) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const updateOrderMut = useMutation({
    mutationFn: async () => {
      await Promise.all(
        items.map((it) =>
          ordersService.updateItem(order.id, it.id, {
            product_id: it.product_id,
            custom_name: it.custom_name || undefined,
            qty: it.qty,
            price: it.price,
            details: {
              parts: buildItemDetails(it) || [],
              bordir: it.bordir,
              benang: it.benang,
              jahitan: it.jahitan
            },
          })
        )
      );

      // 2. Update order terms & valid_until
      await ordersService.update(order.id, {
        customer_id: order.customer_id,
        sales_id: order.sales_id || "",
        courier_name: order.courier_name || undefined,
        shipping_cost: order.shipping_cost || 0,
        shipping_address: order.shipping_address || undefined,
        notes: order.notes || undefined,
        terms_conditions: form.terms_conditions || undefined,
        valid_until: form.valid_until || undefined,
        items: items.map((it: any) => ({
          product_id: it.product_id,
          custom_name: it.custom_name || undefined,
          qty: it.qty,
          price: it.price,
          details: {
            parts: buildItemDetails(it) || [],
            bordir: it.bordir,
            benang: it.benang,
            jahitan: it.jahitan
          },
        })),
      });
    },
    onSuccess: () => {
      toast.success("Quotation updated");
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    updateOrderMut.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Edit Quotation</DialogTitle>
          <DialogDescription>
            {order?.order_number ? `Editing: ${order.order_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="update-quotation-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Items (Click to edit details)</h3>
              <Accordion type="multiple" value={activeItems} onValueChange={setActiveItems} className="w-full space-y-3">
                {items.map((it, idx) => (
                  <AccordionItem value={`item-${idx}`} key={it.id || idx} className="border rounded-md px-4 bg-muted/10">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex flex-col items-start text-left w-full gap-1 pr-4">
                        <div className="font-medium text-sm">{it.product_name}</div>
                        <div className="flex gap-4 text-xs text-muted-foreground font-normal">
                          <span>Qty: {it.qty}</span>
                          <span>Price: {formatIDR(it.price)}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <ItemDetailsFields
                        item={it}
                        isQuotation={true}
                        onChange={(patch) => updateItem(idx, patch)}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Order Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea
                    rows={4}
                    value={form.terms_conditions}
                    onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="update-quotation-form" disabled={updateOrderMut.isPending}>
            {updateOrderMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotaPdfDialog({
  order,
  items,
  customer,
  payments,
  open,
  onClose,
}: {
  order: any;
  items: any[];
  customer: any;
  payments: any[];
  open: boolean;
  onClose: () => void;
}) {
  const [withStamp, setWithStamp] = useState(false);
  const [withSignature, setWithSignature] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !order) return;
    let isActive = true;
    let currentUrl: string | null = null;

    async function loadPdf() {
      try {
        const doc = await generateInvoicePDF({
          order,
          items,
          customer,
          payments,
          bankAccounts: [], // Not needed for nota
          options: { withStamp, withSignature, isNota: true },
        });
        if (isActive) {
          const blob = doc.output("blob");
          currentUrl = URL.createObjectURL(blob);
          setPdfUrl(currentUrl);
        }
      } catch (err) {
        if (isActive) toast.error("Failed to generate PDF preview");
      }
    }
    loadPdf();

    return () => {
      isActive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [open, order, items, customer, payments, withStamp, withSignature]);

  async function handleDownloadPdf() {
    if (!order) return;
    setGenerating(true);
    try {
      const doc = await generateInvoicePDF({
        order,
        items,
        customer,
        payments,
        bankAccounts: [],
        options: { withStamp, withSignature, isNota: true },
      });
      const custName = (customer?.name || "Unknown").replace(/\s+/g, "_");
      const fileName = `Nota-${custName}-${order.order_number ?? order.id.slice(0, 8)}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Preview Nota PDF</span>
            <Button onClick={handleDownloadPdf} disabled={generating || !pdfUrl} size="sm">
              {generating ? "Generating..." : <><FileDown className="h-4 w-4 mr-1" /> Download Nota</>}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-4">
            <div className="text-sm font-medium">Pengaturan PDF</div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={withStamp}
                  onChange={(e) => setWithStamp(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium">Sertakan Stempel</div>
                  <div className="text-xs text-muted-foreground">
                    Tambahkan stempel perusahaan pada area tanda tangan.
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={withSignature}
                  onChange={(e) => setWithSignature(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium">Sertakan Tanda Tangan</div>
                  <div className="text-xs text-muted-foreground">
                    Tambahkan tanda tangan manager di atas nama.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-muted/40 p-4 rounded-md flex justify-center min-h-[600px]">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-[80vh] rounded border bg-white shadow-sm" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Generating preview...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KwitansiPdfDialog({
  payment,
  order,
  customer,
  open,
  onClose,
}: {
  payment: any;
  order: any;
  customer: any;
  open: boolean;
  onClose: () => void;
}) {
  const [withStamp, setWithStamp] = useState(false);
  const [withSignature, setWithSignature] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payment || !order) return;
    let isActive = true;
    let currentUrl: string | null = null;

    async function loadPdf() {
      try {
        const doc = await generateKwitansiPDF({
          payment,
          order,
          customer,
          options: { withStamp, withSignature },
        });
        if (isActive) {
          const blob = doc.output("blob");
          currentUrl = URL.createObjectURL(blob);
          setPdfUrl(currentUrl);
        }
      } catch (err) {
        if (isActive) toast.error("Failed to generate PDF preview");
      }
    }
    loadPdf();

    return () => {
      isActive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [open, payment, order, customer, withStamp, withSignature]);

  async function handleDownloadPdf() {
    if (!payment || !order) return;
    setGenerating(true);
    try {
      const doc = await generateKwitansiPDF({
        payment,
        order,
        customer,
        options: { withStamp, withSignature },
      });
      const custName = (customer?.name || "Unknown").replace(/\s+/g, "_");
      const fileName = `Kwitansi-${custName}-${payment.payment_type}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Preview Kwitansi PDF</span>
            <Button onClick={handleDownloadPdf} disabled={generating || !pdfUrl} size="sm">
              {generating ? "Generating..." : <><FileDown className="h-4 w-4 mr-1" /> Download Kwitansi</>}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-4">
            <div className="text-sm font-medium">Pengaturan PDF</div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={withStamp}
                  onChange={(e) => setWithStamp(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium">Sertakan Stempel</div>
                  <div className="text-xs text-muted-foreground">
                    Tambahkan stempel perusahaan pada area tanda tangan.
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={withSignature}
                  onChange={(e) => setWithSignature(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium">Sertakan Tanda Tangan</div>
                  <div className="text-xs text-muted-foreground">
                    Tambahkan tanda tangan manager di atas nama.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-muted/40 p-4 rounded-md flex justify-center min-h-[600px]">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-[50vh] rounded border bg-white shadow-sm" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Generating preview...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderItemDialog({
  orderId,
  isQuotation,
  item,
  open,
  onClose,
}: {
  orderId: string;
  isQuotation: boolean;
  item?: any;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEditing = !!item;

  const [it, setIt] = useState<Item>({ product_id: "", qty: 1, price: 0, details: [] });

  const productsQ = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productsService.list({ limit: 100 }),
    enabled: open,
  });

  const specTemplates = useQuery({
    queryKey: ["spec-templates", { limit: 100 }],
    queryFn: () => specTemplatesService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (item) {
        let rawDetails = item.details;
        if (typeof rawDetails === "string") {
          try {
            rawDetails = JSON.parse(rawDetails);
          } catch {
            rawDetails = {};
          }
        }
        setIt({
          product_id: item.product_id || item.product?.id || "",
          custom_name: item.custom_name ?? "",
          qty: item.qty || 1,
          price: item.price || 0,
          details: parseDetailsFromBackend(item.details),
          benang: rawDetails?.benang ?? rawDetails?.Benang ?? "",
          bordir: rawDetails?.bordir ?? rawDetails?.Bordir ?? "",
          jahitan: rawDetails?.jahitan ?? rawDetails?.Jahitan ?? "",
        });
      } else {
        setIt({ product_id: "", qty: 1, price: 0, details: [] });
      }
    }
  }, [open, item]);

  const mut = useMutation({
    mutationFn: async () => {
      const details = buildItemDetails(it);
      const body = {
        product_id: it.product_id,
        custom_name: it.custom_name || undefined,
        qty: Number(it.qty),
        price: Number(it.price),
        details: details || {},
      };
      if (isEditing) {
        return ordersService.updateItem(orderId, item.id, body);
      } else {
        return ordersService.addItem(orderId, body);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Item updated" : "Item added");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!it.product_id) return toast.error("Select a product");
    if (!it.qty || Number(it.qty) <= 0) return toast.error("Enter a valid quantity");
    if (it.price === undefined || it.price === null || Number(it.price) < 0) return toast.error("Enter a valid price");
    mut.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <form id="item-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Side: Product Details */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={it.product_id} onValueChange={(val) => {
                   const p = productsQ.data?.data?.find((x: any) => x.id === val);
                   setIt(prev => ({ ...prev, product_id: val, price: p && !isEditing ? (p.base_price ?? 0) : prev.price }));
                }} disabled={productsQ.isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                  <SelectContent>
                    {productsQ.data?.data?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Custom Product Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  placeholder="e.g., Seragam PDH Bank Mandiri"
                  value={it.custom_name ?? ""}
                  onChange={(e) => setIt(prev => ({...prev, custom_name: e.target.value}))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min={1} value={it.qty} onChange={(e) => setIt(prev => ({...prev, qty: Number(e.target.value)}))} />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" min={0} value={it.price} onChange={(e) => setIt(prev => ({...prev, price: Number(e.target.value)}))} />
                </div>
              </div>
            </div>

            {/* Right Side: Material & Specification */}
            <div>
              <ItemDetailsFields
                item={it}
                isQuotation={false}
                hideSpec={true}
                hideCustomName={true}
                onChange={(patch) => setIt(prev => ({...prev, ...patch}))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3 mt-4 text-sm">
            <span className="font-semibold text-muted-foreground">Item Subtotal</span>
            <span className="font-semibold text-primary">{formatIDR((Number(it.qty) || 0) * (Number(it.price) || 0))}</span>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="item-form" disabled={mut.isPending}>
            {mut.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();

  const [shippingOpen, setShippingOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [notaOpen, setNotaOpen] = useState(false);
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const { canVerifyPayment } = useAuth();
  const [updateQuotationOpen, setUpdateQuotationOpen] = useState(false);
  const [kwitansiOpen, setKwitansiOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [withStamp, setWithStamp] = useState(false);
  const [withSignature, setWithSignature] = useState(false);
  const [pdfNote, setPdfNote] = useState("");
  const [useGlobalBank, setUseGlobalBank] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const verifyPaymentMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "verified" | "rejected" }) =>
      paymentsService.verify(id, status),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "verified"
          ? "Pembayaran berhasil diverifikasi"
          : "Pembayaran telah ditolak"
      );
      qc.invalidateQueries({ queryKey: ["order-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orderQ = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId),
  });

  const order = orderQ.data?.data;
  const salesId = order?.sales_id ?? order?.sales?.id ?? null;

  const paymentsQ = useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => ordersService.payments(orderId),
    enabled: !!order,
  });

  const payments = paymentsQ.data?.data ?? [];

  const deletePayment = useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      toast.success("Payment deleted");
      qc.invalidateQueries({ queryKey: ["order-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) => ordersService.deleteItem(orderId, itemId),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => ordersService.updateStatus(orderId, status as import("@/lib/types").OrderStatus),
    onSuccess: () => {
      toast.success("Status pesanan berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => {
      const rawMsg = e?.response?.data?.error || e?.payload?.error || e?.response?.data?.message || e?.message;
      toast.error(translateOrderErrorMessage(rawMsg));
    },
  });

  const handleTransition = (targetStatus: string) => {
    if (!order) return;
    if (targetStatus === "pending" && order.payment_status === "unpaid") {
      return toast.error("Tidak dapat memproses ke antrean: Diperlukan pembayaran uang muka (DP) minimal.");
    }
    if (targetStatus === "completed" && order.payment_status !== "paid") {
      return toast.error("Tidak dapat menyelesaikan pesanan: Sisa tagihan harus dilunasi sebelum pengiriman.");
    }
    statusMut.mutate(targetStatus);
  };

  const items = order?.items ?? [];
  const subtotal = items.reduce(
    (s, i) => s + (i.qty * i.price),
    0,
  );
  const shipping = order?.shipping_cost ?? 0;
  const total = subtotal + shipping;
  const paid = payments
    .filter((p) => (p.status || "pending").toLowerCase() === "verified")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, total - paid);

  useEffect(() => {
    if (pdfOpen) {
      if (paid === 0) {
        const minDp = Math.ceil(total * 0.5);
        setPdfNote(`* Minimal DP 50%: ${formatIDR(minDp)}`);
      } else {
        setPdfNote("");
      }
    }
  }, [pdfOpen, paid, total]);

  useEffect(() => {
    if (!pdfOpen || !order) return;
    let isActive = true;
    let currentUrl: string | null = null;

    async function loadPdf() {
      try {
        let bankAccounts: Awaited<ReturnType<typeof bankAccountsService.byUser>>["data"] = [];
        if (useGlobalBank) {
          const res = await bankAccountsService.global();
          bankAccounts = res.data ?? [];
        } else if (salesId) {
          const res = await bankAccountsService.byUser(salesId);
          bankAccounts = res.data ?? [];
        } else {
          const res = await bankAccountsService.global();
          bankAccounts = res.data ?? [];
        }
        const doc = await generateInvoicePDF({
          order: order!,
          items: order!.items ?? [],
          customer: order!.customer ?? null,
          payments,
          bankAccounts,
          options: { withStamp, withSignature, note: pdfNote },
        });
        if (isActive) {
          const blob = doc.output("blob");
          currentUrl = URL.createObjectURL(blob);
          setPdfUrl(currentUrl);
        }
      } catch (err) {
        if (isActive) toast.error("Failed to generate PDF preview");
      }
    }
    loadPdf();

    return () => {
      isActive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [pdfOpen, order, items, order?.customer, payments, salesId, withStamp, withSignature, pdfNote, useGlobalBank]);

  async function handleDownloadPdf() {
    if (!order) return;
    setGenerating(true);
    try {
      let bankAccounts: Awaited<ReturnType<typeof bankAccountsService.byUser>>["data"] = [];
      if (useGlobalBank) {
        const res = await bankAccountsService.global();
        bankAccounts = res.data ?? [];
      } else if (salesId) {
        const res = await bankAccountsService.byUser(salesId);
        bankAccounts = res.data ?? [];
      } else {
        const res = await bankAccountsService.global();
        bankAccounts = res.data ?? [];
      }
      const doc = await generateInvoicePDF({
        order,
        items: order.items ?? [],
        customer: order.customer ?? null,
        payments,
        bankAccounts,
        options: { withStamp, withSignature, note: pdfNote },
      });
      const custName = (order.customer?.name || "Unknown").replace(/\s+/g, "_");
      const fileName = `Invoice-${custName}-${order.order_number ?? order.id.slice(0, 8)}.pdf`;
      doc.save(fileName);
      setPdfOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }


  if (orderQ.isLoading) {
    return <div className="text-center py-16 text-muted-foreground">Loading order…</div>;
  }
  if (orderQ.isError || !order) {
    return (
      <div className="text-center py-16 text-destructive">
        {(orderQ.error as Error)?.message ?? "Order not found"}
      </div>
    );
  }

  const isQuotation = (order.order_status || "").toLowerCase() === "quotation";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2">
            <Link to="/orders" search={{ page: 1, search: "", order_status: "", payment_status: "", start_date: "", end_date: "", sales_id: "", batch_po_id: "" }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> All Orders
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {order.order_number ?? `Order ${order.id.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge value={order.order_status} map={statusVariant} />
            <Badge value={order.payment_status} map={paymentBadge} />
            <span className="text-xs text-muted-foreground">
              Dibuat {formatDate(order.created_at)}
            </span>
            {order.approved_at && (
              <span className="text-xs font-medium text-emerald-700">
                · Disetujui {formatDate(order.approved_at)}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Header Action Buttons (State Machine Aware) */}
        <div className="flex flex-wrap items-center gap-2">
          {isQuotation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setUpdateQuotationOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit Quotation
              </Button>
              <Button
                variant="outline"
                onClick={() => setQuotationOpen(true)}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Cetak Surat Penawaran
              </Button>
              <Button
                variant="outline"
                onClick={() => setPdfOpen(true)}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Cetak Invoice
              </Button>
              <Button onClick={() => handleTransition("pending")} disabled={statusMut.isPending}>
                Process to Production Queue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPdfOpen(true)}>
                <Printer className="h-4 w-4 mr-1.5" /> Cetak Invoice
              </Button>
              <Button variant="outline" onClick={() => printSpkSuratJalan({ order, items: order.items ?? [], customer: order.customer ?? null })}>
                <Printer className="h-4 w-4 mr-1.5" /> Cetak SPK / Surat Jalan
              </Button>
              {order.payment_status === "paid" && (
                <Button variant="outline" onClick={() => setNotaOpen(true)}>
                  <FileDown className="h-4 w-4 mr-1.5" /> Nota PDF
                </Button>
              )}
              <Button onClick={() => setPayOpen(true)} disabled={remaining <= 0}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Payment
              </Button>
              {order.order_status === "pending" && (
                <Button onClick={() => handleTransition("production")} disabled={statusMut.isPending}>
                  Start Production (Cut Fabric)
                </Button>
              )}
              {order.order_status === "production" && (
                <Button onClick={() => handleTransition("ready")} disabled={statusMut.isPending}>
                  Mark as Finished (Warehouse)
                </Button>
              )}
              {order.order_status === "ready" && (
                <Button onClick={() => handleTransition("completed")} disabled={statusMut.isPending}>
                  Complete & Deliver Order
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column (70%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stepper Card */}
          <Card className="p-4 sm:p-5 border-border/80 shadow-sm">
            <div className="pb-3 border-b mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alur Lifecycle Status Order
              </h3>
            </div>
            <OrderLifecycleStepper currentStatus={order.order_status} />
          </Card>

          {/* Line Items Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Line Items</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                setEditItem(null);
                setItemOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[45%]">Product &amp; Variations</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No items added to this order.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it, idx) => {
                      const parsedParts = parseDetailsFromBackend(it.details);
                      let rawDetails = it.details;
                      if (typeof rawDetails === "string") {
                        try {
                          rawDetails = JSON.parse(rawDetails);
                        } catch {
                          rawDetails = {};
                        }
                      }
                      const detailsObj = (rawDetails || {}) as Record<string, any>;
                      const bordir = detailsObj.bordir ?? detailsObj.Bordir;
                      const benang = detailsObj.benang ?? detailsObj.Benang;
                      const jahitan = detailsObj.jahitan ?? detailsObj.Jahitan;

                      return (
                        <TableRow key={it.id ?? idx} className="align-top">
                          <TableCell className="py-3">
                            <div className="font-semibold text-foreground text-sm">
                              {it.product_name || it.product?.name || "—"}
                            </div>
                            
                            {/* Custom Name Display */}
                            {it.custom_name && (
                              <div className="mt-1">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  Custom Name: {it.custom_name}
                                </span>
                              </div>
                            )}

                            {/* Material Parts Breakdown */}
                            {parsedParts.length > 0 && parsedParts.some(p => p.material_name || p.part || p.spec || p.warna) && (
                              <div className="mt-1.5 space-y-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-muted/50">
                                {parsedParts.map((p, pIdx) => {
                                  const label = p.part ? p.part : `Part ${pIdx + 1}`;
                                  const matStr = [
                                    p.material_name,
                                    p.warna ? `(${p.warna})` : null,
                                  ].filter(Boolean).join(" ");
                                  
                                  if (!p.material_name && !p.spec && !p.warna) return null;
                                  return (
                                    <div key={pIdx} className="leading-tight">
                                      <span className="font-medium text-foreground">{label}:</span>{" "}
                                      <span>{matStr || "—"}</span>
                                      {p.spec && <span className="text-muted-foreground block text-[11px] mt-0.5 pl-2 border-l border-muted-foreground/30">{p.spec}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Additional Specs: Bordir, Benang, Jahitan */}
                            {(bordir || benang || jahitan) && (
                              <div className="mt-1.5 text-[11px] text-muted-foreground space-y-0.5">
                                {bordir && <div><span className="font-medium text-foreground">Bordir:</span> {bordir}</div>}
                                {benang && <div><span className="font-medium text-foreground">Benang:</span> {benang}</div>}
                                {jahitan && <div><span className="font-medium text-foreground">Jahitan:</span> {jahitan}</div>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium py-3">{it.qty}</TableCell>
                          <TableCell className="text-right py-3">{formatIDR(it.price)}</TableCell>
                          <TableCell className="text-right font-semibold text-foreground py-3">
                            {formatIDR(it.qty * it.price)}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditItem(it);
                                  setItemOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this item?")) {
                                    deleteItemMut.mutate(it.id!);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quotation Details Card */}
          {(order.valid_until || order.terms_conditions) && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-semibold">Quotation Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-sm">
                {order.valid_until && (
                  <p>
                    <span className="text-muted-foreground">Valid until:</span>{" "}
                    <span className="font-medium">{formatDate(order.valid_until)}</span>
                  </p>
                )}
                {order.terms_conditions && (
                  <div>
                    <p className="text-muted-foreground mb-1">Terms &amp; Conditions:</p>
                    <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed">
                      {order.terms_conditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payments Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Payments History</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPayOpen(true)} disabled={remaining <= 0}>
                <Plus className="h-4 w-4 mr-1" /> Add Payment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsQ.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        Loading payments…
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No payments recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {formatDateISO(p.payment_date || p.created_at)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {p.reference_number || "—"}
                        </TableCell>
                        <TableCell className="capitalize text-xs font-medium">{p.payment_type}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.bank_account
                            ? `${p.bank_account.bank_name} · ${p.bank_account.account_number}`
                            : p.bank_account_id?.slice(0, 8) || "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatIDR(p.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5 items-center">
                            {canVerifyPayment && (p.status || "pending").toLowerCase() === "pending" && (
                              <>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium gap-1 shadow-xs"
                                      title="Setujui Pembayaran"
                                    >
                                      <Check className="h-3.5 w-3.5" /> Approve
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3 space-y-2" align="end">
                                    <p className="text-xs font-semibold text-emerald-800">Setujui Pembayaran?</p>
                                    <p className="text-xs text-muted-foreground">
                                      Verifikasi pembayaran <strong>{formatIDR(p.amount)}</strong> untuk pesanan ini.
                                    </p>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => verifyPaymentMut.mutate({ id: p.id, status: "verified" })}
                                        disabled={verifyPaymentMut.isPending}
                                      >
                                        {verifyPaymentMut.isPending ? "Proses..." : "Ya, Setujui"}
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 px-2.5 text-xs font-medium gap-1 shadow-xs"
                                      title="Tolak Pembayaran"
                                    >
                                      <X className="h-3.5 w-3.5" /> Reject
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3 space-y-2" align="end">
                                    <p className="text-xs font-semibold text-destructive">Tolak Pembayaran?</p>
                                    <p className="text-xs text-muted-foreground">
                                      Tolak pembayaran <strong>{formatIDR(p.amount)}</strong> ini?
                                    </p>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 text-xs"
                                        onClick={() => verifyPaymentMut.mutate({ id: p.id, status: "rejected" })}
                                        disabled={verifyPaymentMut.isPending}
                                      >
                                        {verifyPaymentMut.isPending ? "Proses..." : "Ya, Tolak"}
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedPayment(p);
                                setKwitansiOpen(true);
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm("Delete this payment?")) deletePayment.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (30% Sidebar Summary Cards) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sidebar Financial Summary Card */}
          <Card className="border-primary/30 shadow-sm bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold text-foreground">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping Cost</span>
                <span className="text-foreground font-medium">{formatIDR(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground">
                <span>Total Amount</span>
                <span>{formatIDR(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Paid</span>
                <span className="text-emerald-700 font-semibold">{formatIDR(paid)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 items-center">
                <span className="font-semibold text-foreground">Outstanding</span>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold border",
                  remaining > 0 ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-emerald-100 text-emerald-900 border-emerald-300"
                )}>
                  {formatIDR(remaining)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold">Informasi Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              <p className="font-semibold text-foreground text-base">{order.customer?.name ?? "—"}</p>
              {order.customer?.phone && (
                <p className="text-muted-foreground text-xs">
                  📞 {order.customer.phone}
                </p>
              )}
              {order.customer?.email && (
                <p className="text-muted-foreground text-xs">
                  ✉️ {order.customer.email}
                </p>
              )}
              {order.customer?.address && (
                <p className="text-muted-foreground text-xs pt-2 border-t leading-relaxed">
                  <span className="font-medium text-foreground block mb-0.5">Alamat Customer:</span>
                  {order.customer.address}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sales & Pengiriman Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Sales &amp; Pengiriman</CardTitle>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShippingOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-sm">
              <div>
                <span className="text-muted-foreground text-xs block">Sales Officer</span>
                <span className="font-medium text-foreground">{order.sales?.name ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Courier / Ekspedisi</span>
                <span className="font-medium text-foreground">{order.courier_name ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Ongkos Kirim</span>
                <span className="font-medium text-foreground">{formatIDR(shipping)}</span>
              </div>
              {order.batch_po && (
                <div>
                  <span className="text-muted-foreground text-xs block">Batch PO</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    {order.batch_po.name}
                    <span
                      title="PO dapat berubah otomatis ke periode aktif saat pelanggan membayar DP (Auto Re-allocate PO)."
                      className="inline-flex cursor-help text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </div>
              )}
              {order.shipping_address && (
                <div className="border-t pt-2">
                  <span className="text-muted-foreground text-xs block font-medium">Alamat Pengiriman</span>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{order.shipping_address}</p>
                </div>
              )}
              {order.notes && (
                <div className="border-t pt-2">
                  <span className="text-muted-foreground text-xs block font-medium">Catatan Order</span>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UpdateShippingDialog
        order={order}
        open={shippingOpen}
        onClose={() => setShippingOpen(false)}
      />

      <UpdateQuotationDialog
        order={order}
        open={updateQuotationOpen}
        onClose={() => setUpdateQuotationOpen(false)}
      />

      <Dialog open={pdfOpen} onOpenChange={(v) => !v && setPdfOpen(false)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>Preview Invoice PDF</span>
              <Button onClick={handleDownloadPdf} disabled={generating || !pdfUrl} size="sm">
                {generating ? "Generating…" : <><FileDown className="h-4 w-4 mr-1" /> Download PDF</>}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            <div className="space-y-4">
              <div className="text-sm font-medium">Pengaturan PDF</div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Catatan Tambahan</Label>
                  <Textarea
                    value={pdfNote}
                    onChange={(e) => setPdfNote(e.target.value)}
                    placeholder="Contoh: * Minimal DP 50%..."
                    className="h-20 resize-none"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={useGlobalBank}
                    onChange={(e) => setUseGlobalBank(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Gunakan Rekening CV (Global)</div>
                    <div className="text-xs text-muted-foreground">
                      Tampilkan rekening perusahaan alih-alih rekening sales.
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={withStamp}
                    onChange={(e) => setWithStamp(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Sertakan Stempel</div>
                    <div className="text-xs text-muted-foreground">
                      Tambahkan stempel perusahaan pada area tanda tangan.
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={withSignature}
                    onChange={(e) => setWithSignature(e.target.checked)}
                  />
                  <div>
                    <div className="text-sm font-medium">Sertakan Tanda Tangan</div>
                    <div className="text-xs text-muted-foreground">
                      Tambahkan tanda tangan manager di atas nama.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-muted/40 p-4 rounded-md flex justify-center min-h-[600px]">
              {pdfUrl ? (
                <iframe src={pdfUrl} className="w-full h-[80vh] rounded border bg-white shadow-sm" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Generating preview...
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuotationPdfDialog
        open={quotationOpen}
        onClose={() => setQuotationOpen(false)}
        order={order}
        items={order.items ?? []}
        customer={order.customer ?? null}
      />

      <OrderItemDialog
        orderId={orderId}
        isQuotation={(order?.order_status || "").toLowerCase() === "quotation"}
        item={editItem}
        open={itemOpen}
        onClose={() => setItemOpen(false)}
      />

      <KwitansiPdfDialog
        open={kwitansiOpen}
        onClose={() => setKwitansiOpen(false)}
        payment={selectedPayment}
        order={order}
        customer={order.customer ?? null}
      />

      <NotaPdfDialog
        open={notaOpen}
        onClose={() => setNotaOpen(false)}
        order={order}
        items={order.items ?? []}
        customer={order.customer ?? null}
        payments={payments}
      />

      <AddPaymentDialog
        orderId={orderId}
        salesId={salesId}
        remaining={remaining}
        currentStatus={order?.order_status}
        orderNumber={order?.order_number}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />
    </div>
  );
}
