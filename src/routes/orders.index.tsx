import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye, Pencil, Search, Filter, X, CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
// ScrollArea import removed

import { ordersService, customersService, productsService, usersService, specTemplatesService, bankAccountsService, paymentsService, batchPosService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { QuickCreateCustomerDialog } from "@/components/QuickCreateCustomerDialog";

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
  const cls = statusVariant[status?.toLowerCase()] ?? "bg-muted text-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status ?? "—"}
    </span>
  );
}

export interface Item {
  product_id: string;
  qty: number;
  price: number;
  // Bahan (nested) — both modes
  bahan_name?: string;
  bahan_color?: string;
  bahan_spec?: string; // quotation only
  // Quotation-only top-level
  benang?: string;
  bordir?: string;
  jahitan?: string;
}

export const BORDIR_AUTOFILL = "Bordir Menggunakan Sistem Komputerisasi";
export const BENANG_AUTOFILL = "Benang Bordir Menggunakan Benang Polyster";

export function buildItemDetails(
  it: Item,
  isQuotation: boolean,
): Record<string, any> | undefined {
  const details: Record<string, any> = {};
  const bahan: Record<string, string> = {};
  if (it.bahan_name?.trim()) bahan.name = it.bahan_name.trim();
  if (it.bahan_color?.trim()) bahan.color = it.bahan_color.trim();
  if (it.bahan_spec?.trim()) bahan.spec = it.bahan_spec.trim();
  if (Object.keys(bahan).length) details.bahan = bahan;
  if (isQuotation) {
    if (it.benang?.trim()) details.Benang = it.benang.trim();
    if (it.bordir?.trim()) details.Bordir = it.bordir.trim();
    if (it.jahitan?.trim()) details.Jahitan = it.jahitan.trim();
  }
  return Object.keys(details).length > 0 ? details : undefined;
}


export function ItemDetailsFields({
  item,
  isQuotation,
  onChange,
  hideSpec = false,
}: {
  item: Item;
  isQuotation: boolean;
  onChange: (patch: Partial<Item>) => void;
  hideSpec?: boolean;
}) {
  const specs = useQuery({
    queryKey: ["spec-templates", { limit: 100 }],
    queryFn: () => specTemplatesService.list({ page: 1, limit: 100 }),
  });

  return (
    <div className="grid gap-3 pt-2 border-t">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Load Material Template (Auto-fill)</Label>
        <Select
          onValueChange={(v) => {
            const t = specs.data?.data?.find(x => x.id === v);
            if (t) {
              onChange({ bahan_name: t.name, bahan_spec: t.spec });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select a template to auto-fill bahan name & spec..." />
          </SelectTrigger>
          <SelectContent>
            {specs.data?.data?.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <span className="font-medium">{t.name}</span>
                <span className="ml-1 text-xs text-muted-foreground">— {t.spec.length > 40 ? t.spec.slice(0, 40) + "…" : t.spec}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Bahan — Name</Label>
          <Input
            placeholder="mis. Katun Baby Canvas"
            value={item.bahan_name ?? ""}
            onChange={(e) => onChange({ bahan_name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Bahan — Color</Label>
          <Input
            placeholder="mis. Hitam"
            value={item.bahan_color ?? ""}
            onChange={(e) => onChange({ bahan_color: e.target.value })}
          />
        </div>
      </div>

      <div className={hideSpec ? "hidden" : "space-y-1"}>
        <Label className="text-xs">Bahan — Spec</Label>
        <Textarea
          rows={2}
          placeholder="Karakteristik tekstur permukaan kain..."
          value={item.bahan_spec ?? ""}
          onChange={(e) => onChange({ bahan_spec: e.target.value })}
        />
      </div>

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
  const [customerId, setCustomerId] = useState("");
  const [salesId, setSalesId] = useState("");
  const [batchPoId, setBatchPoId] = useState("");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

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
  const users = useQuery({
    queryKey: ["users", "sales"],
    queryFn: () => usersService.list({ role: "sales", limit: 100 }),
    enabled: open,
  });
  const activeBatchPOs = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
    enabled: open,
  });

  // Derive the currently selected BatchPO object for guard checks
  const selectedBatchPO = activeBatchPOs.data?.data?.find((b) => b.id === batchPoId);
  const isBatchPOClosed = selectedBatchPO?.status === "closed";
  const isFormLocked = isBatchPOClosed && currentUser.role !== "admin";

  const [courier, setCourier] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [items, setItems] = useState<Item[]>([{ product_id: "", qty: 1, price: 0 }]);

  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("dp");
  const [paymentBankId, setPaymentBankId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", "user", salesId],
    queryFn: () => bankAccountsService.byUser(salesId!),
    enabled: open && !!salesId,
  });

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setSalesId("");
      setBatchPoId("");
      setCourier("");
      setShippingCost("");
      setNote("");
      setTermsConditions("");
      setItems([{ product_id: "", qty: 1, price: 0 }]);
      setPaymentAmount("");
      setPaymentType("dp");
      setPaymentBankId("");
      setPaymentReference("");
    }
  }, [open]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + Number(shippingCost || 0);

  const create = useMutation({
    mutationFn: () =>
      ordersService.create({
        batch_po_id: batchPoId,
        customer_id: customerId,
        sales_id: salesId,
        courier_name: courier || undefined,
        shipping_cost: Number(shippingCost) || 0,
        notes: note || undefined,
        terms_conditions: termsConditions || undefined,
        order_status: "quotation",
        items: items
          .filter((i) => i.product_id && i.qty > 0)
          .map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            price: i.price,
            details: buildItemDetails(i, isQuotation),
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
    if (!customerId) return toast.error("Choose a customer");
    if (!salesId) return toast.error("Choose a sales person");
    if (!items.some((i) => i.product_id && i.qty > 0))
      return toast.error("Add at least one item");
    if (Number(paymentAmount) > 0) {
      if (!paymentBankId) return toast.error("Select bank account for payment");
      if (!paymentType) return toast.error("Select payment type");
    }
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Buat Pesanan Baru</DialogTitle>
          <DialogDescription>
            Create a new order (initialized as quotation).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-order-form" onSubmit={submit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch PO & Customer & Shipping</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {/* Batch PO Selection — mandatory */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Batch PO <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={batchPoId}
                    onValueChange={setBatchPoId}
                    disabled={activeBatchPOs.isLoading}
                  >
                    <SelectTrigger className={!batchPoId ? "border-destructive/50" : ""}>
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
                          <span className="font-medium">{b.name}</span>
                          <span className="ml-1 text-xs text-muted-foreground capitalize">— {b.status}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isBatchPOClosed && (
                    <p className="text-xs text-destructive">
                      {currentUser.role === "admin"
                        ? "⚠ This Batch PO is closed. You have admin access to proceed."
                        : "This Batch PO is closed. Only administrators can add orders."}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sales Person</Label>
                  <Select
                    value={salesId}
                    onValueChange={(v) => {
                      setSalesId(v);
                      setCustomerId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.data?.data?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} {u.role ? `(${u.role})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={!salesId}
                      onClick={() => setNewCustomerOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> New
                    </Button>
                  </div>
                  <Select value={customerId} onValueChange={setCustomerId} disabled={!salesId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={salesId ? "Select customer" : "Pick sales first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.data?.data?.length === 0 && (
                        <div className="px-2 py-3 text-xs text-muted-foreground">
                          No customers for this sales yet.
                        </div>
                      )}
                      {customers.data?.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `· ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Courier</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Cost</Label>
                  <Input
                    type="number"
                    min={0}
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                {isQuotation && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Terms &amp; Conditions</Label>
                    <Textarea
                      rows={3}
                      placeholder="DP Minimal 50%, Waktu Pengerjaan 14 Hari, dll."
                      value={termsConditions}
                      onChange={(e) => setTermsConditions(e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>


            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0 }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="space-y-3 rounded-md border p-3">
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
                          <SelectTrigger>
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
                        onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <ItemDetailsFields
                      item={it}
                      isQuotation={isQuotation}
                      hideSpec={true}
                      onChange={(patch) => updateItem(idx, patch)}
                    />
                  </div>
                ))}

                <div className="border-t pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatIDR(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>{formatIDR(Number(shippingCost) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-2">
                    <span>Total</span>
                    <span>{formatIDR(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {true && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Direct Payment (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <div className="grid grid-cols-3 gap-2 bg-muted/50 p-3 rounded-md text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Order</div>
                        <div className="font-semibold">{formatIDR(total)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Payment</div>
                        <div className="font-semibold text-emerald-600">
                          {formatIDR(Number(paymentAmount) || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Remaining</div>
                        <div className={`font-semibold ${total - (Number(paymentAmount) || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatIDR(total - (Number(paymentAmount) || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Bank Account (Sales)</Label>
                    <Select
                      value={paymentBankId}
                      onValueChange={setPaymentBankId}
                      disabled={!salesId || bankAccounts.isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !salesId
                              ? "Select sales first"
                              : bankAccounts.isLoading
                                ? "Loading…"
                                : "Select bank account"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.data?.data?.map((ba) => (
                          <SelectItem key={ba.id} value={ba.id}>
                            {ba.bank_name} — {ba.account_number} ({ba.account_name})
                          </SelectItem>
                        ))}
                        {bankAccounts.data?.data?.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground">
                            No bank accounts for this sales user.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : "")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dp">DP</SelectItem>
                        <SelectItem value="settlement">SETTLEMENT</SelectItem>
                        <SelectItem value="installment">INSTALLMENT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Reference Number (Optional)</Label>
                    <Input
                      placeholder="TRX-12345"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-order-form"
            disabled={create.isPending || !batchPoId || isFormLocked}
          >
            {create.isPending ? "Creating…" : "Buat Pesanan"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <QuickCreateCustomerDialog
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        salesId={salesId}
        onCreated={(c) => setCustomerId(c.id)}
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
  const [items, setItems] = useState<Item[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("dp");
  const [paymentBankId, setPaymentBankId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", "user", order?.sales_id],
    queryFn: () => bankAccountsService.byUser(order!.sales_id!),
    enabled: open && !!order?.sales_id && !isQuotation,
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
      setPaymentAmount("");
      setPaymentType("dp");
      setPaymentBankId("");
      setPaymentReference("");
      if (order.items) {
        setItems(
          order.items.map((i: any) => {
            const d = (i.details || {}) as Record<string, any>;
            const b = (d.bahan && typeof d.bahan === "object") ? d.bahan : (d.Bahan && typeof d.Bahan === "object" ? d.Bahan : {});
            return {
              product_id: i.product_id,
              qty: i.qty,
              price: i.price,
              bahan_name: b.name ?? b.Name ?? (typeof d.bahan === "string" ? d.bahan : (typeof d.Bahan === "string" ? d.Bahan : "")) ?? "",
              bahan_color: b.color ?? b.Color ?? d.warna ?? d.Warna ?? "",
              bahan_spec: b.spec ?? b.Spec ?? d["Bahan Kemeja"] ?? "",
              benang: d.benang ?? d.Benang ?? "",
              bordir: d.bordir ?? d.Bordir ?? "",
              jahitan: d.jahitan ?? d.Jahitan ?? "",
            };
          }),
        );
      }
    } else if (!open) {
      setItems([]);
    }
  }, [order, open]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + Number(form.shipping_cost || 0);

  const updateMut = useMutation({
    mutationFn: async (body: any) => {
      await ordersService.update(orderId!, body);
      if (!isQuotation && Number(paymentAmount) > 0) {
        await paymentsService.create({
          order_id: orderId!,
          amount: Number(paymentAmount),
          payment_type: paymentType,
          bank_account_id: paymentBankId,
          reference_number: paymentReference || "",
          payment_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      toast.success(isQuotation ? "Quotation updated" : "Order & Payment updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
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
          product_id: i.product_id,
          qty: i.qty,
          price: i.price,
          details: buildItemDetails(i, isQuotation),
        })),
      courier_name: form.courier_name || undefined,
      shipping_cost: Number(form.shipping_cost) || 0,
      shipping_address: form.shipping_address || undefined,
      notes: form.notes || undefined,
      terms_conditions: isQuotation ? (form.terms_conditions || undefined) : undefined,
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0 }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>
                <Accordion type="multiple" className="w-full space-y-3">
                  {items.map((it, idx) => (
                    <AccordionItem value={`item-${idx}`} key={idx} className="border rounded-md px-4 bg-muted/10">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex flex-col items-start text-left w-full gap-1 pr-4">
                          <div className="font-medium text-sm">
                            {products.data?.data?.find(p => p.id === it.product_id)?.name || "Select Product"}
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
                              <SelectTrigger>
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
                            onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
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
                  ))}
                </Accordion>
              </div>

              {!isQuotation && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm">Quick Add Payment (Optional)</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <div className="grid grid-cols-3 gap-2 bg-muted/50 p-3 rounded-md text-sm">
                        <div>
                          <div className="text-muted-foreground">Total Order</div>
                          <div className="font-semibold">{formatIDR(total)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Quick Payment</div>
                          <div className="font-semibold text-emerald-600">
                            {formatIDR(Number(paymentAmount) || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className={`font-semibold ${total - (Number(paymentAmount) || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                            {formatIDR(total - (Number(paymentAmount) || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Bank Account (Sales)</Label>
                      <Select
                        value={paymentBankId}
                        onValueChange={setPaymentBankId}
                        disabled={!order?.sales_id || bankAccounts.isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !order?.sales_id
                                ? "Select sales first"
                                : bankAccounts.isLoading
                                  ? "Loading…"
                                  : "Select bank account"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.data?.data?.map((ba) => (
                            <SelectItem key={ba.id} value={ba.id}>
                              {ba.bank_name} — {ba.account_number} ({ba.account_name})
                            </SelectItem>
                          ))}
                          {bankAccounts.data?.data?.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              No bank accounts for this sales user.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : "")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Type</Label>
                      <Select value={paymentType} onValueChange={setPaymentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dp">DP</SelectItem>
                          <SelectItem value="settlement">SETTLEMENT</SelectItem>
                          <SelectItem value="installment">INSTALLMENT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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


function OrdersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const limit = 10;
  const qc = useQueryClient();

  const [editOrder, setEditOrder] = useState<{ id: string; type: "order" | "quotation" } | null>(null);
  const [createModeOpen, setCreateModeOpen] = useState(false);

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

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track every order from intake through delivery.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateModeOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">All Orders</CardTitle>
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
                    <Label className="text-xs">Order Status</Label>
                    <Select
                      value={search.order_status || "all"}
                      onValueChange={(v) =>
                        setFilter({ order_status: v === "all" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statusList.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        <SelectItem value="all">All</SelectItem>
                        {paymentStatusList.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
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
                        <SelectItem value="all">All</SelectItem>
                        {salesUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="capitalize">
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Batch PO</Label>
                    <Select
                      value={search.batch_po_id || "all"}
                      onValueChange={(v) =>
                        setFilter({ batch_po_id: v === "all" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {allBatchPOs.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <span>{b.name}</span>
                            <span className="ml-1 text-xs text-muted-foreground capitalize">— {b.status}</span>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-destructive py-8">
                    {(error as Error)?.message ?? "Failed to load orders"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
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
              {orders.map((o) => (
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
                  <TableCell>
                    <StatusBadge status={o.order_status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatIDR(o.total_amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground capitalize">
                    {o.payment_status ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Quick Update"
                        onClick={() => setEditOrder({ id: o.id, type: o.order_status === "quotation" ? "quotation" : "order" })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="View">
                        <Link to="/orders/$orderId" params={{ orderId: o.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this order?")) deleteMut.mutate(o.id);
                        }}
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
    </div>
  );
}
