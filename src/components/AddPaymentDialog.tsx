import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Banknote, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { bankAccountsService, ordersService, paymentsService } from "@/lib/services";
import { datetimeLocalToISO, formatIDR, isoToDatetimeLocal } from "@/lib/format";
import { CurrencyInput } from "@/components/CurrencyInput";

const paymentTypeList = ["dp", "settlement", "installment"] as const;

export interface AddPaymentDialogProps {
  orderId: string | null;
  salesId?: string | null;
  remaining?: number;
  currentStatus?: string;
  orderNumber?: string;
  open: boolean;
  onClose: () => void;
}

export function AddPaymentDialog({
  orderId,
  salesId,
  remaining = 0,
  currentStatus,
  orderNumber,
  open,
  onClose,
}: AddPaymentDialogProps) {
  const qc = useQueryClient();

  // Always fetch order payments & order details when open to guarantee accurate verified total calculation
  const orderPaymentsQuery = useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => ordersService.payments(orderId!),
    enabled: open && !!orderId,
  });

  const orderDetailsQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.get(orderId!),
    enabled: open && !!orderId,
  });

  const fetchedOrder = orderDetailsQuery.data?.data;
  const fetchedPayments = orderPaymentsQuery.data?.data;

  const effectiveSalesId = salesId ?? fetchedOrder?.sales_id;
  const effectiveOrderNumber = orderNumber ?? fetchedOrder?.order_number ?? (orderId ? orderId.slice(0, 8) : "");
  const effectiveStatus = currentStatus ?? fetchedOrder?.order_status;
  
  // Calculate remaining balance using strictly VERIFIED payments
  let effectiveRemaining = remaining;
  if (fetchedPayments) {
    const total = fetchedOrder?.total_amount;
    const verifiedPaid = fetchedPayments
      .filter((p) => (p.status || "").toLowerCase() === "verified")
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    
    if (total !== undefined) {
      effectiveRemaining = Math.max(0, total - verifiedPaid);
    }
  } else if (fetchedOrder) {
    const total = fetchedOrder.total_amount || 0;
    const verifiedPaid = (fetchedOrder.payments || [])
      .filter((p) => (p.status || "").toLowerCase() === "verified")
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    effectiveRemaining = Math.max(0, total - verifiedPaid);
  }

  // Bank accounts scoped to sales + global
  const bankAccounts = useQuery({
    queryKey: ["bank-accounts", "user", effectiveSalesId],
    queryFn: () => bankAccountsService.byUser(effectiveSalesId!),
    enabled: open && !!effectiveSalesId,
  });

  const globalBankAccounts = useQuery({
    queryKey: ["bank-accounts", "global"],
    queryFn: () => bankAccountsService.global(),
    enabled: open,
  });

  const allBankAccounts = useQuery({
    queryKey: ["bank-accounts", "list"],
    queryFn: () => bankAccountsService.list({ page: 1, limit: 100 }),
    enabled: open && !effectiveSalesId,
  });

  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState<string>("dp");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (open) {
      // Default payment date to current local datetime
      setPaymentDate(isoToDatetimeLocal(new Date().toISOString()));
      setBankAccountId("");
      setAmount("");
      setPaymentType("dp");
      setReferenceNumber("");
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Order ID is missing");
      await paymentsService.create({
        order_id: orderId,
        bank_account_id: bankAccountId,
        amount: Number(amount),
        payment_type: paymentType,
        reference_number: referenceNumber,
        payment_date: datetimeLocalToISO(paymentDate),
      });
      if (effectiveStatus === "quotation" && (paymentType === "dp" || paymentType === "settlement")) {
        try {
          await ordersService.updateStatus(orderId, "pending");
          toast.success("Order otomatis berpindah ke status pending");
        } catch (e) {
          // ignore
        }
      }
    },
    onSuccess: () => {
      toast.success("Pembayaran berhasil dicatat");
      if (orderId) {
        qc.invalidateQueries({ queryKey: ["order-payments", orderId] });
        qc.invalidateQueries({ queryKey: ["order", orderId] });
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
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
        "Gagal mencatat pembayaran";
      toast.error(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankAccountId) return toast.error("Pilih rekening bank");
    if (!amount || Number(amount) <= 0) return toast.error("Masukkan jumlah pembayaran yang valid");
    if (!paymentType) return toast.error("Pilih jenis pembayaran");
    if (!referenceNumber.trim()) return toast.error("Masukkan nomor referensi");
    createMut.mutate();
  }

  const handleFullPayment = () => {
    if (effectiveRemaining > 0) {
      setAmount(effectiveRemaining);
      setPaymentType("settlement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Add Payment {effectiveOrderNumber ? `(#${effectiveOrderNumber})` : ""}
          </DialogTitle>
          <DialogDescription>
            Catat pembayaran DP, Pelunasan, atau Angsuran untuk pesanan ini.
            {effectiveRemaining > 0 && (
              <span className="block mt-1 text-foreground font-medium">
                Sisa Tagihan (Outstanding):{" "}
                <strong className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {formatIDR(effectiveRemaining)}
                </strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Rekening Bank Tujuan</Label>
            <Select
              value={bankAccountId}
              onValueChange={setBankAccountId}
              disabled={bankAccounts.isLoading || globalBankAccounts.isLoading || allBankAccounts.isLoading}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue
                  placeholder={
                    bankAccounts.isLoading || globalBankAccounts.isLoading || allBankAccounts.isLoading
                      ? "Memuat rekening..."
                      : "Pilih rekening bank"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {globalBankAccounts.data?.data && globalBankAccounts.data.data.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Global / Rekening Perusahaan</SelectLabel>
                    {globalBankAccounts.data.data.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.bank_name} — {ba.account_number} ({ba.account_name})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {bankAccounts.data?.data && bankAccounts.data.data.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Rekening Sales</SelectLabel>
                    {bankAccounts.data.data.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.bank_name} — {ba.account_number} ({ba.account_name})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {!effectiveSalesId && allBankAccounts.data?.data && (
                  <SelectGroup>
                    <SelectLabel>Semua Rekening Bank</SelectLabel>
                    {allBankAccounts.data.data.map((ba) => (
                      <SelectItem key={ba.id} value={ba.id}>
                        {ba.bank_name} — {ba.account_number} ({ba.account_name})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Quick Button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Jumlah Pembayaran (Amount)</Label>
              {effectiveRemaining > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFullPayment}
                  className="h-6 px-2 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-medium"
                >
                  <CheckCircle className="h-3 w-3 mr-1" /> Bayar Lunas (Full)
                </Button>
              )}
            </div>
            <CurrencyInput
              value={amount}
              onChange={(val) => setAmount(val)}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>

          {/* Payment Type & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tipe Pembayaran</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih tipe" />
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

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tanggal Pembayaran</Label>
              <Input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Nomor Referensi / Bukti Transfer</Label>
            <Input
              placeholder="Contoh: TRX-987654321 atau Ref Bank"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </form>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            form="record-payment-form"
            size="sm"
            disabled={createMut.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {createMut.isPending ? "Menyimpan…" : "Simpan Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
