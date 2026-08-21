import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Filter, Eye, CheckCircle2, DollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination-custom";

import { payrollsService, workLogsService } from "@/lib/services";
import { formatDate, formatIDR } from "@/lib/format";
import type { Payroll, PayrollStatus, WorkLog } from "@/lib/types/payroll";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/payrolls")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    limit: Number(search.limit) > 0 ? Number(search.limit) : 10,
    status: typeof search.status === "string" ? search.status : "",
    start_date: typeof search.start_date === "string" ? search.start_date : "",
    end_date: typeof search.end_date === "string" ? search.end_date : "",
  }),
  head: () => ({
    meta: [
      { title: "Payrolls — SIKOn ERP" },
      { name: "description", content: "Rekapitulasi penggajian mingguan dan pencairan pengeluaran HPP." },
    ],
  }),
  component: PayrollsPage,
});

// Status Badges
const STATUS_BADGE: Record<PayrollStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-100 text-amber-800 border-amber-200" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800 border-blue-200" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

// ─── Create Payroll 3-Step Wizard Modal ──────────────────────────────────────

function CreatePayrollModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2 State - Checklist of work log IDs
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch unpaid logs within date range
  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["work-logs", "unpaid", startDate, endDate],
    queryFn: () => workLogsService.list({ start_date: startDate || undefined, end_date: endDate || undefined, unpaid_only: true, limit: 200 }),
    enabled: open && step >= 2,
  });

  const availableLogs = logsData?.data ?? [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(availableLogs.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleLog = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const selectedLogs = availableLogs.filter((l) => selectedIds.includes(l.id));
  const calculatedTotal = selectedLogs.reduce((acc, curr) => acc + curr.total_amount, 0);

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof payrollsService.createRekap>[0]) =>
      payrollsService.createRekap(body),
    onSuccess: () => {
      toast.success("Payroll rekap created as Draft!");
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      qc.invalidateQueries({ queryKey: ["work-logs"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSaveDraft() {
    if (selectedIds.length === 0) return toast.error("Please select at least 1 work log");
    createMut.mutate({
      start_date: startDate,
      end_date: endDate,
      work_log_ids: selectedIds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payroll Rekap</DialogTitle>
          <DialogDescription>
            Wizard rekapitulasi penggajian borongan berdasarkan catatan kerja harian.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps Indicator */}
        <div className="flex items-center justify-between border-b pb-3 my-2 text-xs font-medium">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-primary font-bold" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">1</span>
            Pilih Periode
          </div>
          <div className="w-8 h-px bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-primary font-bold" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">2</span>
            Checklist Work Logs
          </div>
          <div className="w-8 h-px bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? "text-primary font-bold" : "text-muted-foreground"}`}>
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]">3</span>
            Kalkulasi & Simpan
          </div>
        </div>

        {/* STEP 1: Date Range Selection */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <p className="text-sm">Tentukan rentang tanggal periode hasil kerja yang akan dirangkap ke dalam payroll:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Work Logs Checklist */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Menampilkan daftar work logs yang <strong>Belum Digaji</strong> (Periode: {startDate} s/d {endDate})
              </span>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={availableLogs.length > 0 && selectedIds.length === availableLogs.length}
                  onCheckedChange={(c) => handleSelectAll(!!c)}
                />
                <Label htmlFor="select-all" className="text-xs font-semibold cursor-pointer">Pilih Semua ({availableLogs.length})</Label>
              </div>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-2 bg-slate-50">
              {isLoadingLogs && <Skeleton className="h-12 w-full" />}
              {!isLoadingLogs && availableLogs.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Tidak ada catatan kerja (unpaid) pada rentang tanggal tersebut.
                </div>
              )}
              {availableLogs.map((log) => {
                const checked = selectedIds.includes(log.id);
                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between p-2 rounded-md border bg-white transition-all cursor-pointer ${
                      checked ? "border-primary bg-blue-50/30" : "border-slate-200"
                    }`}
                    onClick={() => handleToggleLog(log.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox checked={checked} onCheckedChange={() => handleToggleLog(log.id)} />
                      <div>
                        <p className="text-xs font-semibold">{log.worker_name} — <span className="text-muted-foreground font-normal">{log.job_type}</span></p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(log.work_date)} • {log.batch_po_name || "Non-PO"} • {log.qty} pcs @ {formatIDR(log.rate_per_qty)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-slate-800">{formatIDR(log.total_amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Summary Calculation */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <Card className="bg-slate-50/70 border-slate-200">
              <CardContent className="py-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Periode Rekap:</span>
                  <span className="font-semibold">{formatDate(startDate)} — {formatDate(endDate)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Jumlah Catatan Kerja (Work Logs):</span>
                  <span className="font-semibold">{selectedLogs.length} items</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold">Total Nominal Gaji Rekap:</span>
                  <span className="text-lg font-extrabold text-primary tabular-nums">{formatIDR(calculatedTotal)}</span>
                </div>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Rekap ini akan disimpan dalam status <strong>Draft</strong>. Anda dapat memverifikasi atau langsung memproses cair ke status <strong>Paid</strong> nanti.
            </p>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => (s - 1) as any)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            {step === 1 && (
              <Button
                size="sm"
                disabled={!startDate || !endDate}
                onClick={() => {
                  if (new Date(startDate) > new Date(endDate)) return toast.error("Start date must be before end date");
                  setStep(2);
                }}
              >
                Next: Checklist Logs
              </Button>
            )}
            {step === 2 && (
              <Button
                size="sm"
                disabled={selectedIds.length === 0}
                onClick={() => setStep(3)}
              >
                Next: Kalkulasi ({selectedIds.length})
              </Button>
            )}
            {step === 3 && (
              <Button size="sm" disabled={createMut.isPending} onClick={handleSaveDraft}>
                {createMut.isPending ? "Saving Draft…" : "Save as Draft"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Payroll Detail Modal ───────────────────────────────────────────────────

function PayrollDetailModal({ payrollId, onClose }: { payrollId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["payrolls", "detail", payrollId],
    queryFn: () => payrollsService.get(payrollId),
  });

  const payroll = data?.data;
  const logs = payroll?.work_logs ?? [];

  return (
    <Dialog open={!!payrollId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Payroll #{payroll?.payroll_no || "Detail"}
            {payroll?.status && (
              <Badge variant="outline" className={STATUS_BADGE[payroll.status].className}>
                {STATUS_BADGE[payroll.status].label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Periode: {payroll ? `${formatDate(payroll.start_date)} - ${formatDate(payroll.end_date)}` : "—"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
              <div>
                <p className="text-xs text-muted-foreground">Total Nominal Gaji</p>
                <p className="text-xl font-bold text-primary tabular-nums">{formatIDR(payroll?.total_amount || 0)}</p>
              </div>
              {payroll?.expense_id && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Linked Expense ID</p>
                  <p className="text-xs font-semibold text-emerald-700">{payroll.expense_id}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold mb-2">Terikat Catatan Kerja ({logs.length} Work Logs)</h4>
              <div className="border rounded-md overflow-hidden text-xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead className="text-right">Qty & Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">{formatDate(log.work_date)}</TableCell>
                        <TableCell className="font-medium">{log.worker_name}</TableCell>
                        <TableCell>{log.job_type}</TableCell>
                        <TableCell className="text-right tabular-nums">{log.qty} pcs @ {formatIDR(log.rate_per_qty)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatIDR(log.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function PayrollsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { page, limit, status, start_date, end_date } = search;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payroll | null>(null);
  const [payTarget, setPayTarget] = useState<Payroll | null>(null);

  const setFilter = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }), replace: true });

  const setLimit = (l: number) =>
    navigate({ search: (prev) => ({ ...prev, limit: l, page: 1 }), replace: true });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["payrolls", "list", { page, limit, status, start_date, end_date }],
    queryFn: () => payrollsService.list({
      page,
      limit,
      status: status || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
    }),
  });

  const payMut = useMutation({
    mutationFn: (id: string) => payrollsService.processPayment(id, user?.id || "user-1"),
    onSuccess: () => {
      toast.success("Payroll marked as Paid & HPP Expense automatically created!");
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setPayTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => payrollsService.delete(id),
    onSuccess: () => {
      toast.success("Payroll deleted");
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      qc.invalidateQueries({ queryKey: ["work-logs"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const rows = data?.data ?? [];
  const totalData = data?.paging?.total_data ?? rows.length;
  const totalPage = data?.paging?.total_page ?? 1;

  const hasAnyFilter = !!(status || start_date || end_date);

  function clearFilters() {
    navigate({ search: () => ({ page: 1, limit, status: "", start_date: "", end_date: "" }), replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payrolls</h1>
          <p className="text-sm text-muted-foreground">
            Rekapitulasi penggajian mingguan dan pencairan pengeluaran HPP.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create Payroll Rekap
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 w-40">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status || "__all__"} onValueChange={(v) => setFilter({ status: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" className="w-36" value={start_date} onChange={(e) => setFilter({ start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input type="date" className="w-36" value={end_date} onChange={(e) => setFilter({ end_date: e.target.value })} />
            </div>

            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payroll Rekap Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payroll No</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expense Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load payrolls"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <p className="font-medium">No payroll rekap records found</p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => {
                const statusBadge = STATUS_BADGE[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-slate-800">{p.payroll_no}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(p.start_date)} - {formatDate(p.end_date)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold tabular-nums text-slate-900">
                      {formatIDR(p.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.status === "paid" && p.expense_id ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Expense Created
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDetailTargetId(p.id)}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Detail
                        </Button>
                        {p.status !== "paid" && (
                          <Button variant="default" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setPayTarget(p)}>
                            <DollarSign className="mr-1 h-3.5 w-3.5" /> Pay / Process
                          </Button>
                        )}
                        {p.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(p)}>
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

      {/* Pagination */}
      <Pagination
        page={page}
        limit={limit}
        totalData={totalData}
        totalPage={totalPage}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* Wizard Modal */}
      {createModalOpen && (
        <CreatePayrollModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      )}

      {/* Detail Modal */}
      {detailTargetId && (
        <PayrollDetailModal payrollId={detailTargetId} onClose={() => setDetailTargetId(null)} />
      )}

      {/* Pay Confirmation Dialog */}
      <AlertDialog open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Payroll Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan memproses status <strong>Payroll #{payTarget?.payroll_no}</strong> menjadi <strong className="text-emerald-700">Paid</strong> sebesar <strong>{formatIDR(payTarget?.total_amount || 0)}</strong>.
              <br /><br />
              Tindakan ini akan secara otomatis men-trigger sistem untuk mencatat <strong>Pengeluaran HPP Gaji Borongan</strong> pada modul Expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={payMut.isPending}
              onClick={() => payTarget && payMut.mutate(payTarget.id)}
            >
              {payMut.isPending ? "Processing…" : "Process Payment & Create Expense"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Draft Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus draft rekap <strong>"{deleteTarget?.payroll_no}"</strong>? Catatan kerja (Work Logs) yang terikat akan secara otomatis terlepas dan kembali berstatus belum digaji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete Draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
