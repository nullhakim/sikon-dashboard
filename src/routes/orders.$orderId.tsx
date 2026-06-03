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
} from "lucide-react";
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
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ordersService,
  paymentsService,
  bankAccountsService,
} from "@/lib/services";
import { formatIDR, formatDate, formatDateISO, datetimeLocalToISO } from "@/lib/format";
import { generateInvoicePDF } from "@/lib/invoice";
import { QuotationPdfDialog } from "@/components/QuotationPdfDialog";
import { UpdateOrderDialog } from "@/routes/orders.index";

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

function AddPaymentDialog({
  orderId,
  salesId,
  remaining,
  open,
  onClose,
}: {
  orderId: string;
  salesId?: string | null;
  remaining: number;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Bank accounts scoped to the order's sales user.
  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", "user", salesId],
    queryFn: () => bankAccountsService.byUser(salesId!),
    enabled: open && !!salesId,
  });

  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (!open) {
      setBankAccountId("");
      setAmount("");
      setPaymentType("");
      setReferenceNumber("");
      setPaymentDate("");
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: () =>
      paymentsService.create({
        order_id: orderId,
        bank_account_id: bankAccountId,
        amount: Number(amount),
        payment_type: paymentType,
        reference_number: referenceNumber,
        payment_date: datetimeLocalToISO(paymentDate),
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["order-payments", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankAccountId) return toast.error("Select a sales bank account");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (!paymentType) return toast.error("Choose a payment type");
    if (!referenceNumber.trim()) return toast.error("Enter a reference number");
    createMut.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a DP, settlement, or installment payment for this order.
            {remaining > 0 && (
              <span className="block mt-1 text-foreground">
                Outstanding balance: <strong>{formatIDR(remaining)}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form id="add-payment-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Bank Account (Sales)</Label>
            <Select
              value={bankAccountId}
              onValueChange={setBankAccountId}
              disabled={!salesId || bankAccounts.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !salesId
                      ? "No sales assigned"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={1}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypeList.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="TRX-0987654321"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-payment-form" disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Save Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [withStamp, setWithStamp] = useState(false);
  const [withSignature, setWithSignature] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  const items = order?.items ?? [];
  const subtotal = items.reduce(
    (s, i) => s + (i.qty * i.price),
    0,
  );
  const shipping = order?.shipping_cost ?? 0;
  const total = order?.total_amount ?? subtotal + shipping;
  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, total - paid);

  async function handleDownloadPdf() {
    if (!order) return;
    setGenerating(true);
    try {
      let bankAccounts: Awaited<ReturnType<typeof bankAccountsService.byUser>>["data"] = [];
      if (salesId) {
        const res = await bankAccountsService.byUser(salesId);
        bankAccounts = res.data ?? [];
      }
      await generateInvoicePDF({
        order,
        items: order.items ?? [],
        customer: order.customer ?? null,
        payments,
        bankAccounts,
        options: { withStamp, withSignature },
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2">
            <Link to="/orders">
              <ArrowLeft className="h-4 w-4 mr-1" /> All Orders
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {order.order_number ?? `Order ${order.id.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge value={order.order_status} map={statusVariant} />
            <Badge value={order.payment_status} map={paymentBadge} />
            <span className="text-xs text-muted-foreground">
              Created {formatDate(order.created_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              printQuotation({
                order,
                items: order.items ?? [],
                customer: order.customer ?? null,
              })
            }
          >
            <Printer className="h-4 w-4 mr-1" /> Print Quotation
          </Button>
          <Button variant="outline" onClick={() => setPdfOpen(true)}>
            <FileDown className="h-4 w-4 mr-1" /> Invoice PDF
          </Button>
          <Button onClick={() => setPayOpen(true)} disabled={remaining <= 0}>
            <Plus className="h-4 w-4 mr-1" /> Add Payment
          </Button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{order.customer?.name ?? "—"}</p>
            {order.customer?.phone && (
              <p className="text-muted-foreground">{order.customer.phone}</p>
            )}
            {order.customer?.address && (
              <p className="text-muted-foreground">{order.customer.address}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sales & Shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Sales:</span>{" "}
              <span className="font-medium">{order.sales?.name ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Courier:</span>{" "}
              {order.courier_name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Shipping cost:</span>{" "}
              {formatIDR(shipping)}
            </p>
            {order.shipping_address && (
              <p className="text-muted-foreground pt-1">{order.shipping_address}</p>
            )}
            {order.notes && (
              <p className="text-muted-foreground pt-1">
                <span className="font-medium text-foreground">Notes:</span> {order.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {(order.valid_until || order.terms_conditions) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quotation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.valid_until && (
              <p>
                <span className="text-muted-foreground">Valid until:</span>{" "}
                <span className="font-medium">{formatDate(order.valid_until)}</span>
              </p>
            )}
            {order.terms_conditions && (
              <div>
                <p className="text-muted-foreground mb-1">Terms &amp; Conditions:</p>
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                  {order.terms_conditions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No items.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it, idx) => {
                  const detailEntries = it.details ? Object.entries(it.details) : [];
                  return (
                    <TableRow key={it.id ?? idx}>
                      <TableCell>
                        <div className="font-medium">
                          {it.product_name || it.product?.name || "—"}
                        </div>
                        {detailEntries.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {detailEntries.map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{it.qty}</TableCell>
                      <TableCell className="text-right">{formatIDR(it.price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIDR(it.qty * it.price)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-6 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-foreground font-medium">{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span className="text-foreground font-medium">{formatIDR(shipping)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Paid</span>
            <span className="text-foreground font-medium">{formatIDR(paid)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Outstanding</span>
            <span className={remaining > 0 ? "text-amber-600" : "text-emerald-600"}>
              {formatIDR(remaining)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payments</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setPayOpen(true)} disabled={remaining <= 0}>
            <Plus className="h-4 w-4 mr-1" /> Add Payment
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Loading payments…
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
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
                    <TableCell className="capitalize">{p.payment_type}</TableCell>
                    <TableCell className="text-sm">
                      {p.bank_account
                        ? `${p.bank_account.bank_name} · ${p.bank_account.account_number}`
                        : p.bank_account_id?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(p.amount)}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UpdateOrderDialog
        orderId={editOpen ? orderId : null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <AddPaymentDialog
        orderId={orderId}
        salesId={salesId}
        remaining={remaining}
        open={payOpen}
        onClose={() => setPayOpen(false)}
      />

      <Dialog open={pdfOpen} onOpenChange={(v) => !v && setPdfOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice PDF</DialogTitle>
            <DialogDescription>
              Pilih elemen yang ingin disertakan dalam invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownloadPdf} disabled={generating}>
              {generating ? "Generating…" : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
