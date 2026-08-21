import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Filter, Lock } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination-custom";
import { Skeleton } from "@/components/ui/skeleton";

import { workLogsService, workersService, batchPosService } from "@/lib/services";
import { formatDate, formatIDR } from "@/lib/format";
import type { WorkLog, JobType } from "@/lib/types/payroll";

export const Route = createFileRoute("/work-logs")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    limit: Number(search.limit) > 0 ? Number(search.limit) : 10,
    start_date: typeof search.start_date === "string" ? search.start_date : "",
    end_date: typeof search.end_date === "string" ? search.end_date : "",
    worker_id: typeof search.worker_id === "string" ? search.worker_id : "",
    batch_po_id: typeof search.batch_po_id === "string" ? search.batch_po_id : "",
    job_type: typeof search.job_type === "string" ? search.job_type : "",
    unpaid_only: search.unpaid_only === "true" || search.unpaid_only === true,
  }),
  head: () => ({
    meta: [
      { title: "Work Logs — SIKOn ERP" },
      { name: "description", content: "Pencatatan hasil kerja harian penjahit & pemotong." },
    ],
  }),
  component: WorkLogsPage,
});

interface WorkLogForm {
  worker_id: string;
  batch_po_id: string;
  job_type: JobType;
  qty: string;
  rate_per_qty: string;
  work_date: string;
  notes: string;
}

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

const emptyForm: WorkLogForm = {
  worker_id: "",
  batch_po_id: "",
  job_type: "jahit",
  qty: "",
  rate_per_qty: "",
  work_date: getTodayDateStr(),
  notes: "",
};

function WorkLogModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: WorkLog | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WorkLogForm>(emptyForm);
  const isEdit = !!target;

  // Options
  const { data: workersData } = useQuery({
    queryKey: ["workers", "all"],
    queryFn: () => workersService.list({ limit: 100, status: "active" }),
    enabled: open,
  });
  const { data: poData } = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
    enabled: open,
  });

  const workers = workersData?.data ?? [];
  const activePOs = poData?.data ?? [];

  useState(() => {
    if (target) {
      setForm({
        worker_id: target.worker_id,
        batch_po_id: target.batch_po_id || "",
        job_type: target.job_type,
        qty: String(target.qty),
        rate_per_qty: String(target.rate_per_qty),
        work_date: target.work_date,
        notes: target.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  });

  // Calculation
  const qtyNum = Number(form.qty) || 0;
  const rateNum = Number(form.rate_per_qty) || 0;
  const totalAmount = qtyNum * rateNum;

  const saveMut = useMutation({
    mutationFn: (body: Parameters<typeof workLogsService.create>[0]) =>
      isEdit ? workLogsService.update(target.id, body) : workLogsService.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Work log updated" : "Work log recorded");
      qc.invalidateQueries({ queryKey: ["work-logs"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.worker_id) return toast.error("Worker is required");
    if (!form.job_type) return toast.error("Job type is required");
    if (qtyNum <= 0) return toast.error("Qty must be > 0");
    if (rateNum <= 0) return toast.error("Rate must be > 0");
    if (!form.work_date) return toast.error("Date is required");

    const selectedPO = activePOs.find((p) => p.id === form.batch_po_id);

    saveMut.mutate({
      worker_id: form.worker_id,
      batch_po_id: form.batch_po_id || undefined,
      batch_po_name: selectedPO?.name,
      job_type: form.job_type,
      qty: qtyNum,
      rate_per_qty: rateNum,
      work_date: form.work_date,
      notes: form.notes.trim() || undefined,
    });
  }

  const set = (k: keyof WorkLogForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Work Log" : "New Work Log"}</DialogTitle>
            <DialogDescription>Catat hasil pekerjaan harian borongan.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Worker */}
            <div className="space-y-2">
              <Label htmlFor="wl-worker">Worker <span className="text-destructive">*</span></Label>
              <Select value={form.worker_id} onValueChange={(v) => setForm((p) => ({ ...p, worker_id: v }))}>
                <SelectTrigger id="wl-worker"><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch PO & Job Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wl-po">Batch PO <span className="text-xs text-muted-foreground">(optional)</span></Label>
                <Select value={form.batch_po_id} onValueChange={(v) => setForm((p) => ({ ...p, batch_po_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger id="wl-po"><SelectValue placeholder="Select Batch PO" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {activePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id}>{po.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wl-job">Job Type <span className="text-destructive">*</span></Label>
                <Select value={form.job_type} onValueChange={(v: JobType) => setForm((p) => ({ ...p, job_type: v }))}>
                  <SelectTrigger id="wl-job"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jahit">Jahit</SelectItem>
                    <SelectItem value="potong">Potong</SelectItem>
                    <SelectItem value="bordir">Bordir</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Qty & Rate per Qty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wl-qty">Qty (pcs) <span className="text-destructive">*</span></Label>
                <Input id="wl-qty" type="number" min={1} placeholder="0" value={form.qty} onChange={set("qty")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-rate">Rate / Pcs (Rp) <span className="text-destructive">*</span></Label>
                <Input id="wl-rate" type="number" min={0} placeholder="0" value={form.rate_per_qty} onChange={set("rate_per_qty")} />
              </div>
            </div>

            {/* Work Date & Calculated Total */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="wl-date">Work Date <span className="text-destructive">*</span></Label>
                <Input id="wl-date" type="date" value={form.work_date} onChange={set("work_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wl-total">Total Amount (Rp)</Label>
                <Input id="wl-total" type="text" disabled className="bg-slate-50 font-bold text-primary" value={formatIDR(totalAmount)} />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="wl-notes">Notes</Label>
              <Textarea id="wl-notes" placeholder="Catatan detail pekerjaan…" value={form.notes} onChange={set("notes")} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : isEdit ? "Update Work Log" : "Save Work Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkLogsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { page, limit, start_date, end_date, worker_id, batch_po_id, job_type, unpaid_only } = search;

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkLog | null>(null);

  const setFilter = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }), replace: true });

  const setLimit = (l: number) =>
    navigate({ search: (prev) => ({ ...prev, limit: l, page: 1 }), replace: true });

  // Filter options
  const { data: workersData } = useQuery({
    queryKey: ["workers", "all"],
    queryFn: () => workersService.list({ limit: 100 }),
  });
  const { data: poData } = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
  });

  const workers = workersData?.data ?? [];
  const activePOs = poData?.data ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["work-logs", "list", { page, limit, start_date, end_date, worker_id, batch_po_id, job_type, unpaid_only }],
    queryFn: () => workLogsService.list({
      page,
      limit,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      worker_id: worker_id || undefined,
      batch_po_id: batch_po_id || undefined,
      job_type: job_type || undefined,
      unpaid_only,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workLogsService.delete(id),
    onSuccess: () => {
      toast.success("Work log deleted");
      qc.invalidateQueries({ queryKey: ["work-logs"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const rows = data?.data ?? [];
  const totalData = data?.paging?.total_data ?? rows.length;
  const totalPage = data?.paging?.total_page ?? 1;

  const hasAnyFilter = !!(start_date || end_date || worker_id || batch_po_id || job_type || unpaid_only);

  function clearFilters() {
    navigate({ search: () => ({ page: 1, limit, start_date: "", end_date: "", worker_id: "", batch_po_id: "", job_type: "", unpaid_only: false }), replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Logs</h1>
          <p className="text-sm text-muted-foreground">
            Pencatatan hasil kerja harian penjahit & pemotong.
          </p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Work Log
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" className="w-36" value={start_date} onChange={(e) => setFilter({ start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input type="date" className="w-36" value={end_date} onChange={(e) => setFilter({ end_date: e.target.value })} />
            </div>
            <div className="space-y-1 w-44">
              <Label className="text-xs text-muted-foreground">Worker</Label>
              <Select value={worker_id || "__all__"} onValueChange={(v) => setFilter({ worker_id: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Workers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Workers</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-40">
              <Label className="text-xs text-muted-foreground">Batch PO</Label>
              <Select value={batch_po_id || "__all__"} onValueChange={(v) => setFilter({ batch_po_id: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Batch POs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Batch POs</SelectItem>
                  {activePOs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs text-muted-foreground">Job Type</Label>
              <Select value={job_type || "__all__"} onValueChange={(v) => setFilter({ job_type: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All Jobs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Jobs</SelectItem>
                  <SelectItem value="jahit">Jahit</SelectItem>
                  <SelectItem value="potong">Potong</SelectItem>
                  <SelectItem value="bordir">Bordir</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox id="unpaid" checked={unpaid_only} onCheckedChange={(c) => setFilter({ unpaid_only: !!c })} />
              <Label htmlFor="unpaid" className="text-xs font-medium cursor-pointer">Belum Digaji Only</Label>
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
          <CardTitle className="text-base">Work Log Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead>Job Type</TableHead>
                <TableHead>Batch PO</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate / Pcs</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Payroll Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load work logs"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <p className="font-medium">No work logs recorded</p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((wl) => {
                const isBound = !!wl.payroll_id;
                return (
                  <TableRow key={wl.id}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(wl.work_date)}
                    </TableCell>
                    <TableCell className="font-medium">{wl.worker_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50">{wl.job_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {wl.batch_po_name ? (
                        <Badge variant="secondary">{wl.batch_po_name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{wl.qty} pcs</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatIDR(wl.rate_per_qty)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatIDR(wl.total_amount)}</TableCell>
                    <TableCell>
                      {isBound ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                          <Lock className="h-3 w-3" /> Terikat Payroll #{wl.payroll_no || wl.payroll_id}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                          Belum Digaji
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={isBound}
                          title={isBound ? "Locked by Payroll" : "Edit"}
                          onClick={() => { setEditTarget(wl); setModalOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={isBound}
                          title={isBound ? "Locked by Payroll" : "Delete"}
                          onClick={() => setDeleteTarget(wl)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Modal Add/Edit */}
      {modalOpen && (
        <WorkLogModal
          open={modalOpen}
          target={editTarget}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete work log for <strong>"{deleteTarget?.worker_name}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
