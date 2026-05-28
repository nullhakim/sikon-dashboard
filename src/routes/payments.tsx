import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { paymentsService, ordersService, bankAccountsService } from "@/lib/services";
import { formatIDR, formatDateISO, datetimeLocalToISO } from "@/lib/format";
import type { Payment } from "@/lib/types";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments — SIKOn ERP" },
      { name: "description", content: "Track payment history: DP, settlement, and installment records." },
    ],
  }),
  component: PaymentsPage,
});

const paymentTypeList = ["dp", "settlement", "installment"] as const;

const typeVariant: Record<string, string> = {
  dp: "bg-amber-100 text-amber-800 border-amber-200",
  settlement: "bg-emerald-100 text-emerald-800 border-emerald-200",
  installment: "bg-blue-100 text-blue-800 border-blue-200",
};

function TypeBadge({ type }: { type: string }) {
  const cls = typeVariant[type?.toLowerCase()] ?? "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase ${cls}`}>
      {type ?? "—"}
    </span>
  );
}

// ─── Create Payment Dialog ──────────────────────────────────────────────

function CreatePaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();

  const orders = useQuery({
    queryKey: ["orders", { page: 1, limit: 100 }],
    queryFn: () => ordersService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", { page: 1, limit: 100 }],
    queryFn: () => bankAccountsService.list({ page: 1, limit: 100 }),
    enabled: open,
  });

  const [orderId, setOrderId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (!open) {
      setOrderId("");
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
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return toast.error("Select an order");
    if (!bankAccountId) return toast.error("Select a bank account");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (!paymentType) return toast.error("Choose a payment type");
    if (!referenceNumber.trim()) return toast.error("Enter a reference number");
    createMut.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Process a DP, settlement, or installment payment.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-payment-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.data?.data?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_number || o.id.slice(0, 8)} — {o.customer?.name || "Unknown"} — {formatIDR(o.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.data?.data?.map((ba) => (
                    <SelectItem key={ba.id} value={ba.id}>
                      {ba.bank_name} — {ba.account_number} ({ba.account_name})
                    </SelectItem>
                  ))}
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
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-payment-form" disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Payment Dialog ────────────────────────────────────────────────

function EditPaymentDialog({
  payment,
  open,
  onClose,
}: {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentType, setPaymentType] = useState("");

  useEffect(() => {
    if (payment && open) {
      setReferenceNumber(payment.reference_number || "");
      setPaymentType(payment.payment_type || "");
    }
  }, [payment, open]);

  const updateMut = useMutation({
    mutationFn: () =>
      paymentsService.update(payment!.id, {
        reference_number: referenceNumber || undefined,
        payment_type: paymentType || undefined,
      }),
    onSuccess: () => {
      toast.success("Payment updated");
      qc.invalidateQueries({ queryKey: ["payments"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>Update reference number or payment type.</DialogDescription>
        </DialogHeader>

        <form id="edit-payment-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reference Number</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
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
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-payment-form" disabled={updateMut.isPending}>
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

function PaymentsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payments", { page, limit }],
    queryFn: () => paymentsService.list({ page, limit }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      toast.success("Payment deleted");
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payments = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            DP, settlement &amp; installment payment tracking.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Record Payment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    {(error as Error).message}
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-xs font-mono">
                      {formatDateISO(p.payment_date || p.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {p.reference_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.order_id?.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={p.payment_type} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.bank_account
                        ? `${p.bank_account.bank_name} · ${p.bank_account.account_number}`
                        : p.bank_account_id?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditPayment(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
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

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPage}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialogs */}
      <CreatePaymentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditPaymentDialog
        payment={editPayment}
        open={!!editPayment}
        onClose={() => setEditPayment(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This payment record will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteMut.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
