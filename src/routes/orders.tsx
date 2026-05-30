import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2, Eye, Pencil } from "lucide-react";
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

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — SIKOn ERP" },
      { name: "description", content: "Manage konveksi orders: create, view, update status." },
    ],
  }),
  component: OrdersPage,
});

const statusList: OrderStatus[] = ["pending", "production", "completed", "canceled"];

const statusVariant: Record<string, string> = {
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

interface ItemDetail {
  key: string;
  value: string;
}

interface Item {
  product_id: string;
  qty: number;
  price: number;
  details: ItemDetail[];
}

function ItemDetailsDialog({
  open,
  onClose,
  details,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  details: ItemDetail[];
  onSave: (details: ItemDetail[]) => void;
}) {
  const [localDetails, setLocalDetails] = useState<ItemDetail[]>([]);

  useEffect(() => {
    if (open) setLocalDetails(details);
  }, [open, details]);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
          <DialogDescription>Add attributes like size, color, etc.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
          {localDetails.map((d, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Key (e.g. Ukuran)"
                value={d.key}
                onChange={(e) => {
                  const arr = [...localDetails];
                  arr[i].key = e.target.value;
                  setLocalDetails(arr);
                }}
              />
              <Input
                placeholder="Value (e.g. L)"
                value={d.value}
                onChange={(e) => {
                  const arr = [...localDetails];
                  arr[i].value = e.target.value;
                  setLocalDetails(arr);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setLocalDetails(localDetails.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocalDetails([...localDetails, { key: "", value: "" }])}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Detail
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(localDetails); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const customers = useQuery({
    queryKey: ["customers", { page: 1, limit: 100 }],
    queryFn: () => customersService.list({ page: 1, limit: 100 }),
    enabled: open,
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

  const [customerId, setCustomerId] = useState("");
  const [salesId, setSalesId] = useState("");
  const [courier, setCourier] = useState("");
  const [shippingCost, setShippingCost] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ product_id: "", qty: 1, price: 0, details: [] }]);
  const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setSalesId("");
      setCourier("");
      setShippingCost("");
      setAddress("");
      setNote("");
      setItems([{ product_id: "", qty: 1, price: 0, details: [] }]);
      setActiveDetailIndex(null);
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
        items: items.filter((i) => i.product_id && i.qty > 0).map(i => {
          const parsedDetails = i.details.reduce((acc, curr) => {
            if (curr.key.trim()) acc[curr.key.trim()] = curr.value.trim();
            return acc;
          }, {} as Record<string, string>);
          
          return {
            product_id: i.product_id,
            qty: i.qty,
            price: i.price,
            details: Object.keys(parsedDetails).length > 0 ? parsedDetails : undefined
          };
        }),
      }),
    onSuccess: () => {
      toast.success("Order created");
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
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>Create a new order and its line items.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-order-form" onSubmit={submit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer & Shipping</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.data?.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `· ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sales Person</Label>
                  <Select value={salesId} onValueChange={setSalesId}>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0, details: [] }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_80px_120px_auto_auto] items-end">
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
                      variant="outline"
                      onClick={() => setActiveDetailIndex(idx)}
                    >
                      Details ({it.details.length})
                    </Button>
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
            {create.isPending ? "Creating…" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ItemDetailsDialog
      open={activeDetailIndex !== null}
      onClose={() => setActiveDetailIndex(null)}
      details={activeDetailIndex !== null ? items[activeDetailIndex].details : []}
      onSave={(newDetails) => {
        if (activeDetailIndex !== null) {
          updateItem(activeDetailIndex, { details: newDetails });
        }
      }}
    />
    </>
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

  const [form, setForm] = useState({
    courier_name: "",
    shipping_cost: 0,
    shipping_address: "",
    notes: "",
  });
  const [items, setItems] = useState<Item[]>([]);
  const [activeDetailIndex, setActiveDetailIndex] = useState<number | null>(null);

  useEffect(() => {
    if (order) {
      setForm({
        courier_name: order.courier_name || "",
        shipping_cost: order.shipping_cost || 0,
        shipping_address: order.shipping_address || "",
        notes: order.notes || "",
      });
      if (order.items) {
        setItems(order.items.map((i: any) => ({
          product_id: i.product_id,
          qty: i.qty,
          price: i.price,
          details: i.details ? Object.entries(i.details).map(([k, v]) => ({ key: k, value: String(v) })) : []
        })));
      }
    } else if (!open) {
      setItems([]);
      setActiveDetailIndex(null);
    }
  }, [order, open]);

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + Number(form.shipping_cost || 0);

  const updateMut = useMutation({
    mutationFn: (body: any) => ordersService.update(orderId!, body),
    onSuccess: () => {
      toast.success("Shipping details updated");
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
      items: items.filter((i) => i.product_id && i.qty > 0).map(i => {
        const parsedDetails = i.details.reduce((acc, curr) => {
          if (curr.key.trim()) acc[curr.key.trim()] = curr.value.trim();
          return acc;
        }, {} as Record<string, string>);
        return {
          product_id: i.product_id,
          qty: i.qty,
          price: i.price,
          details: Object.keys(parsedDetails).length > 0 ? parsedDetails : undefined
        };
      }),
      courier_name: form.courier_name || undefined,
      shipping_cost: Number(form.shipping_cost) || 0,
      shipping_address: form.shipping_address || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Update Order</DialogTitle>
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
                    onClick={() => setItems((arr) => [...arr, { product_id: "", qty: 1, price: 0, details: [] }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_80px_120px_auto_auto] items-end">
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
                        variant="outline"
                        onClick={() => setActiveDetailIndex(idx)}
                      >
                        Details ({it.details.length})
                      </Button>
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
    <ItemDetailsDialog
      open={activeDetailIndex !== null}
      onClose={() => setActiveDetailIndex(null)}
      details={activeDetailIndex !== null ? items[activeDetailIndex].details : []}
      onSave={(newDetails) => {
        if (activeDetailIndex !== null) {
          updateItem(activeDetailIndex, { details: newDetails });
        }
      }}
    />
    </>
  );
}

function OrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", { page, limit }],
    queryFn: () => ordersService.list({ page, limit }),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track every order from intake through delivery.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Order
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Orders</CardTitle>
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading orders…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive py-8">
                    {(error as Error)?.message ?? "Failed to load orders"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
              {orders.map((o) => (
                <TableRow key={o.id}>
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
                        className={`h-7 w-[130px] text-xs font-medium capitalize border ${
                          statusVariant[o.order_status?.toLowerCase()] ?? ""
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailOrderId(o.id)}
                      >
                        <Eye className="h-4 w-4" />
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <OrderDetailDialog 
        orderId={detailOrderId} 
        open={!!detailOrderId} 
        onClose={() => setDetailOrderId(null)} 
      />

      <CreateOrderDialog 
        open={createOpen} 
        onClose={() => setCreateOpen(false)} 
      />
    </div>
  );
}
