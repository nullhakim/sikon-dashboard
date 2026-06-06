import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye, Pencil, Search, Filter, X, CalendarIcon } from "lucide-react";
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
// ScrollArea import removed

import { ordersService, customersService, productsService, usersService } from "@/lib/services";
import { formatIDR, formatDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { QuickCreateCustomerDialog } from "@/components/QuickCreateCustomerDialog";

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
  }),
  component: OrdersPage,
});

const statusList: OrderStatus[] = ["quotation", "pending", "production", "completed", "canceled"];
const paymentStatusList = ["unpaid", "partial", "paid"];

const statusVariant: Record<string, string> = {
  quotation: "bg-violet-100 text-violet-800 border-violet-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  production: "bg-blue-100 text-blue-800 border-blue-200",
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

interface Item {
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

function buildItemDetails(
  it: Item,
  isQuotation: boolean,
): Record<string, any> | undefined {
  const details: Record<string, any> = {};
  const bahan: Record<string, string> = {};
  if (it.bahan_name?.trim()) bahan.Name = it.bahan_name.trim();
  if (it.bahan_color?.trim()) bahan.Color = it.bahan_color.trim();
  if (isQuotation && it.bahan_spec?.trim()) bahan.Spec = it.bahan_spec.trim();
  if (Object.keys(bahan).length) details.Bahan = bahan;
  if (isQuotation) {
    if (it.benang?.trim()) details.Benang = it.benang.trim();
    if (it.bordir?.trim()) details.Bordir = it.bordir.trim();
    if (it.jahitan?.trim()) details.Jahitan = it.jahitan.trim();
  }
  return Object.keys(details).length > 0 ? details : undefined;
}


function ItemDetailsFields({
  item,
  isQuotation,
  onChange,
}: {
  item: Item;
  isQuotation: boolean;
  onChange: (patch: Partial<Item>) => void;
}) {
  return (
    <div className="grid gap-3 pt-2 border-t">
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

      {isQuotation && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Bahan — Spec (PDF Quotation only)</Label>
            </div>
            <Textarea
              rows={2}
              placeholder="Karakteristik tekstur permukaan kain..."
              value={item.bahan_spec ?? ""}
              onChange={(e) => onChange({ bahan_spec: e.target.value })}
            />
          </div>

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

function CreateOrderDialog({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: "quotation" | "order" }) {
  const isQuotation = mode === "quotation";
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [salesId, setSalesId] = useState("");
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
    queryKey: ["users", { page: 1, limit: 100 }],
    queryFn: () => usersService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  const [courier, setCourier] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [items, setItems] = useState<Item[]>([{ product_id: "", qty: 1, price: 0 }]);

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setSalesId("");
      setCourier("");
      setShippingCost("");
      setAddress("");
      setNote("");
      setTermsConditions("");
      setItems([{ product_id: "", qty: 1, price: 0 }]);
    }
  }, [open]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + Number(shippingCost || 0);

  const create = useMutation({
    mutationFn: () =>
      ordersService.create({
        customer_id: customerId,
        sales_id: salesId,
        courier_name: courier || undefined,
        shipping_cost: Number(shippingCost) || 0,
        shipping_address: address || undefined,
        notes: note || undefined,
        terms_conditions: isQuotation ? (termsConditions || undefined) : undefined,
        ...(isQuotation ? { order_status: "quotation" } : {}),
        items: items
          .filter((i) => i.product_id && i.qty > 0)
          .map((i) => ({
            product_id: i.product_id,
            qty: i.qty,
            price: i.price,
            details: buildItemDetails(i, isQuotation),
          })),
      }),
    onSuccess: () => {
      toast.success(isQuotation ? "Quotation created" : "Order created");
      qc.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("Choose a customer");
    if (!salesId) return toast.error("Choose a sales person");
    if (!items.some((i) => i.product_id && i.qty > 0))
      return toast.error("Add at least one item");
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>{isQuotation ? "Buat Penawaran" : "Buat Pesanan"}</DialogTitle>
          <DialogDescription>
            {isQuotation ? "Create a new quotation (Surat Penawaran)." : "Create a new direct order."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-order-form" onSubmit={submit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer & Shipping</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  <Label>Address</Label>
                  <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
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
          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-order-form" disabled={create.isPending}>
            {create.isPending ? "Creating…" : isQuotation ? "Buat Penawaran" : "Buat Pesanan"}
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
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
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
  const isQuotation = (order?.order_status || "").toLowerCase() === "quotation";

  const [form, setForm] = useState({
    courier_name: "",
    shipping_cost: 0,
    shipping_address: "",
    notes: "",
    terms_conditions: "",
  });
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (order) {
      setForm({
        courier_name: order.courier_name || "",
        shipping_cost: order.shipping_cost || 0,
        shipping_address: order.shipping_address || "",
        notes: order.notes || "",
        terms_conditions: order.terms_conditions || "",
      });
      if (order.items) {
        setItems(
          order.items.map((i: any) => {
            const d = (i.details || {}) as Record<string, any>;
            const b =
              d.Bahan && typeof d.Bahan === "object" ? d.Bahan : {};
            return {
              product_id: i.product_id,
              qty: i.qty,
              price: i.price,
              bahan_name:
                b.Name ?? (typeof d.Bahan === "string" ? d.Bahan : "") ?? "",
              bahan_color: b.Color ?? d.Warna ?? "",
              bahan_spec: b.Spec ?? d["Bahan Kemeja"] ?? "",
              benang: d.Benang ?? "",
              bordir: d.Bordir ?? "",
              jahitan: d.Jahitan ?? "",
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
    mutationFn: (body: any) => ordersService.update(orderId!, body),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
                  <h3 className="font-semibold">Line Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0 }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>
                <div className="space-y-3">
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
                        onChange={(patch) => updateItem(idx, patch)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <form id="shipping-form" onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-semibold">Logistics & Notes</h3>
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

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatIDR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">{formatIDR(form.shipping_cost || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatIDR(total)}</span>
                </div>
              </div>
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

  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"quotation" | "order" | null>(null);

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

  const queryParams = useMemo(
    () => ({
      page: search.page,
      limit,
      search: search.search || undefined,
      order_status: search.order_status || undefined,
      payment_status: search.payment_status || undefined,
      start_date: search.start_date || undefined,
      end_date: search.end_date || undefined,
    }),
    [search],
  );

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["orders", queryParams],
    queryFn: () => ordersService.list(queryParams),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersService.delete(id),
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const page = search.page;

  const startDate = search.start_date ? new Date(search.start_date) : undefined;
  const endDate = search.end_date ? new Date(search.end_date) : undefined;

  const activeFilterCount =
    (search.order_status ? 1 : 0) +
    (search.payment_status ? 1 : 0) +
    (search.start_date || search.end_date ? 1 : 0);

  const hasAnyFilter =
    !!search.search ||
    !!search.order_status ||
    !!search.payment_status ||
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
          <Button variant="outline" onClick={() => setCreateMode("quotation")}>
            <Plus className="mr-1 h-4 w-4" /> New Quotation
          </Button>
          <Button onClick={() => setCreateMode("order")}>
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive py-8">
                    {(error as Error)?.message ?? "Failed to load orders"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
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
                  <TableCell className="font-medium">
                    {o.customer?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(o.created_at)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.order_status}
                      onValueChange={(v) =>
                        statusMut.mutate({ id: o.id, status: v as OrderStatus })
                      }
                    >
                      <SelectTrigger
                        className={`h-7 w-[130px] text-xs font-medium capitalize border ${statusVariant[o.order_status?.toLowerCase()] ?? ""
                          }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusList.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatIDR(o.total_amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground capitalize">
                    {o.payment_status ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <Link to="/orders/$orderId" params={{ orderId: o.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditOrderId(o.id)}
                      >
                        <Pencil className="h-4 w-4" />
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
            disabled={page >= totalPage}
            onClick={() => setPage(page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>


      <UpdateOrderDialog
        orderId={editOrderId}
        open={!!editOrderId}
        onClose={() => setEditOrderId(null)}
      />


      <CreateOrderDialog
        open={createMode !== null}
        onClose={() => setCreateMode(null)}
        mode={createMode ?? "order"}
      />
    </div>
  );
}
