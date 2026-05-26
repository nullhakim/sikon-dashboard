import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { customersService, productsService, ordersService } from "@/lib/services";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/orders/new")({
  head: () => ({
    meta: [{ title: "New Order — SIKOn ERP" }],
  }),
  component: NewOrder,
});

interface Item {
  product_id: string;
  quantity: number;
  price: number;
  notes?: string;
}

function NewOrder() {
  const navigate = useNavigate();
  const customers = useQuery({
    queryKey: ["customers", { page: 1, limit: 100 }],
    queryFn: () => customersService.list({ page: 1, limit: 100 }),
  });
  const products = useQuery({
    queryKey: ["products", { page: 1, limit: 100 }],
    queryFn: () => productsService.list({ page: 1, limit: 100 }),
  });

  const [customerId, setCustomerId] = useState("");
  const [courier, setCourier] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([
    { product_id: "", quantity: 1, price: 0 },
  ]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const total = subtotal + Number(shippingCost || 0);

  const create = useMutation({
    mutationFn: () =>
      ordersService.create({
        customer_id: customerId,
        courier: courier || undefined,
        shipping_cost: Number(shippingCost) || 0,
        address: address || undefined,
        note: note || undefined,
        items: items.filter((i) => i.product_id && i.quantity > 0),
      }),
    onSuccess: () => {
      toast.success("Order created");
      navigate({ to: "/orders" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error("Choose a customer");
    if (!items.some((i) => i.product_id && i.quantity > 0))
      return toast.error("Add at least one item");
    create.mutate();
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>
        <p className="text-sm text-muted-foreground">
          Create a new order and its line items.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer & Shipping</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
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
            <Textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
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
            onClick={() =>
              setItems((arr) => [...arr, { product_id: "", quantity: 1, price: 0 }])
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid gap-3 sm:grid-cols-[1fr_100px_140px_auto] items-end"
            >
              <div className="space-y-1">
                <Label className="text-xs">Product</Label>
                <Select
                  value={it.product_id}
                  onValueChange={(v) => {
                    const p = products.data?.data?.find((x) => x.id === v);
                    updateItem(idx, {
                      product_id: v,
                      price: p?.base_price ?? it.price,
                    });
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
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
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

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/orders" })}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
