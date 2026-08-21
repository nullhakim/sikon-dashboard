import { useState, useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Search, Filter, X, CalendarIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
import { Pagination } from "@/components/ui/pagination-custom";

import { paymentsService, ordersService, bankAccountsService } from "@/lib/services";
import { formatIDR, formatDateISO, datetimeLocalToISO, formatDate, isoToDatetimeLocal } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { CurrencyInput } from "@/components/CurrencyInput";

const searchSchema = z.object({
  search: z.string().optional().catch(""),
  payment_type: z.string().optional().catch(""),
  status: z.string().optional().catch(""),
  start_date: z.string().optional().catch(""),
  end_date: z.string().optional().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(10),
});

export const Route = createFileRoute("/payments")({
  validateSearch: searchSchema,
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

const statusVariantMap: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  verified: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
};

export function StatusBadge({ status }: { status?: string }) {
  const s = (status || "pending").toLowerCase();
  const cls = statusVariantMap[s] ?? "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {s}
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
    if (open) {
      setPaymentDate(isoToDatetimeLocal(new Date().toISOString()));
    } else {
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
    onError: (e: any) => {
      const msg =
        e?.response?.data?.error ??
        e?.payload?.error ??
        e?.response?.data?.message ??
        e?.payload?.message ??
        e?.message ??
        "Payment record failed";
      toast.error(msg);
    },
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
                <CurrencyInput
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  placeholder="0"
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

// ─── Verify Payment Dialog ──────────────────────────────────────────────

function VerifyPaymentDialog({
  payment,
  open,
  onClose,
}: {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const verifyMut = useMutation({
    mutationFn: (status: "verified" | "rejected") =>
      paymentsService.verify(payment!.id, status),
    onSuccess: () => {
      toast.success("Payment verification updated");
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["orders"] }); // May affect order paid status
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Finance approval for payment {payment?.reference_number || "—"}. 
            Amount: {formatIDR(payment?.amount || 0)}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="default"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => verifyMut.mutate("verified")}
            disabled={verifyMut.isPending}
          >
            Approve & Verify
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => verifyMut.mutate("rejected")}
            disabled={verifyMut.isPending}
          >
            Reject Payment
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={verifyMut.isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

function PaymentsPage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { canVerifyPayment } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [verifyPayment, setVerifyPayment] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.search || "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (searchParams.search || "")) {
        navigate({
          search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
        });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchInput, navigate, searchParams.search]);

  // Default tab to 'pending' (Need Verification) for Accounting/Owner roles if no status searchParam set
  const effectiveStatus = searchParams.status ?? (canVerifyPayment ? "pending" : "all");

  const queryParams = {
    ...searchParams,
    status: effectiveStatus === "all" ? undefined : effectiveStatus,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payments", queryParams],
    queryFn: () => paymentsService.list(queryParams),
  });

  // Query summary for tab counts
  const summaryQuery = useQuery({
    queryKey: ["payments", "tab-counts"],
    queryFn: () => paymentsService.list({ page: 1, limit: 100 }),
  });

  const summaryPayments = summaryQuery.data?.data ?? [];
  const pendingCount = summaryPayments.filter((p) => (p.status || "pending").toLowerCase() === "pending").length;
  const verifiedCount = summaryPayments.filter((p) => (p.status || "").toLowerCase() === "verified").length;
  const rejectedCount = summaryPayments.filter((p) => (p.status || "").toLowerCase() === "rejected").length;
  const totalCount = summaryPayments.length;

  const tabs = [
    { label: "Need Verification", value: "pending", count: pendingCount, highlight: true },
    { label: "All Payments", value: "all", count: totalCount },
    { label: "Verified", value: "verified", count: verifiedCount },
    { label: "Rejected", value: "rejected", count: rejectedCount },
  ];

  const startDate = searchParams.start_date ? new Date(searchParams.start_date) : undefined;
  const endDate = searchParams.end_date ? new Date(searchParams.end_date) : undefined;

  const activeFilterCount =
    (searchParams.payment_type ? 1 : 0) +
    (searchParams.start_date || searchParams.end_date ? 1 : 0) +
    (searchParams.status && searchParams.status !== "all" ? 1 : 0);

  const hasAnyFilter = !!searchParams.search || activeFilterCount > 0;

  const clearAll = () =>
    navigate({
      search: () => ({ page: 1, limit: 10, status: canVerifyPayment ? "pending" : "all" }),
    });

  const setFilter = (patch: Partial<typeof searchParams>) => {
    navigate({
      search: (prev) => ({ ...prev, ...patch, page: 1 }),
    });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      toast.success("Payment deleted");
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payments = (data?.data ?? []).filter((p) => {
    if (effectiveStatus === "all") return true;
    return (p.status || "pending").toLowerCase() === effectiveStatus.toLowerCase();
  });
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

      {/* Tab Filter System */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {tabs.map((tab) => {
          const isSelected = effectiveStatus === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter({ status: tab.value })}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.highlight && tab.count > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-background text-muted-foreground border"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Payment History</CardTitle>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:min-w-[420px] sm:justify-end flex-wrap">
              <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by Reference or Order ID..."
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
                    <Label className="text-xs">Payment Type</Label>
                    <Select
                      value={searchParams.payment_type || "all"}
                      onValueChange={(v) =>
                        setFilter({ payment_type: v === "all" ? undefined : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {paymentTypeList.map((t) => (
                          <SelectItem key={t} value={t} className="uppercase">
                            {t}
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
                              !startDate && "text-muted-foreground"
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
                              setFilter({ start_date: d ? format(d, "yyyy-MM-dd") : undefined })
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
                              !endDate && "text-muted-foreground"
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
                              setFilter({ end_date: d ? format(d, "yyyy-MM-dd") : undefined })
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
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
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
                    No payments found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-xs font-mono">
                      {formatDate(p.payment_date || p.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {p.reference_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.order?.order_number || "—"}…
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={p.payment_type} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatIDR(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.bank_account
                        ? `${p.bank_account.bank_name} · ${p.bank_account.account_name}`
                        : p.bank_account_id?.slice(0, 8) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canVerifyPayment && (p.status || "pending").toLowerCase() === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
                            onClick={() => setVerifyPayment(p)}
                            title="Verify Payment"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
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
      <Pagination
        page={searchParams.page}
        limit={searchParams.limit || 10}
        totalData={data?.paging?.total_item ?? payments.length}
        totalPage={totalPage}
        onPageChange={(p) => navigate({ search: (prev) => ({ ...prev, page: p }) })}
        onLimitChange={(l) => navigate({ search: (prev) => ({ ...prev, limit: l, page: 1 }) })}
      />

      {/* Dialogs */}
      <CreatePaymentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditPaymentDialog
        payment={editPayment}
        open={!!editPayment}
        onClose={() => setEditPayment(null)}
      />
      <VerifyPaymentDialog
        payment={verifyPayment}
        open={!!verifyPayment}
        onClose={() => setVerifyPayment(null)}
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
