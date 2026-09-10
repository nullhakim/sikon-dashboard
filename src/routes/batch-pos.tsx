import { useState, useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Layers,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { batchPosService } from "@/lib/services";
import { formatDate } from "@/lib/format";
import type { BatchPO } from "@/lib/types";

export const Route = createFileRoute("/batch-pos")({
  head: () => ({
    meta: [
      { title: "Batch PO — SIKOn ERP" },
      { name: "description", content: "Manage production batch purchase orders." },
    ],
  }),
  component: BatchPOsPage,
});

// ─── Status Badge ────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-rose-100 text-rose-700 border-rose-200",
};

function BatchStatusBadge({ status }: { status: string }) {
  const cls = statusStyles[status?.toLowerCase()] ?? "bg-muted text-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}
    >
      {status ?? "—"}
    </span>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

interface BatchPOForm {
  name: string;
  target_month: number | "";
  target_year: number | "";
  open_date: string;
  close_date: string;
  start_date: string;
  end_date: string;
  quota: number | "";
}

const emptyForm: BatchPOForm = {
  name: "", target_month: "", target_year: "",
  open_date: "", close_date: "", start_date: "", end_date: "", quota: "",
};

function BatchPODialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: BatchPO | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  // Auto-prefill open_date dari close_date PO terakhir (aturan: buka PO baru = tutup PO sebelumnya).
  // Cuma perlu jalan untuk PO BARU (bukan editing), dan cuma sekali saat dialog dibuka.
  const suggestedOpenDate = useQuery({
    queryKey: ["batch-pos", "suggested-open-date"],
    queryFn: () => batchPosService.suggestedOpenDate(),
    enabled: open && !editing, // cuma fetch saat dialog kebuka untuk mode "create"
  });
  const [form, setForm] = useState<BatchPOForm>(emptyForm);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        target_month: editing.target_month ?? "",
        target_year: editing.target_year ?? "",
        open_date: editing.open_date ? editing.open_date.slice(0, 10) : "",
        close_date: editing.close_date ? editing.close_date.slice(0, 10) : "",
        start_date: editing.start_date ? editing.start_date.slice(0, 10) : "",
        end_date: editing.end_date ? editing.end_date.slice(0, 10) : "",
        quota: editing.quota,
      });
    } else {
      // PO baru: open_date diisi dari hasil suggestedOpenDate begitu query-nya selesai (lihat effect di bawah)
      setForm(emptyForm);
    }
  }, [editing, open]);

  // Begitu suggestedOpenDate selesai fetch (mode create), isi otomatis ke form
  useEffect(() => {
    const suggested = suggestedOpenDate.data?.data?.open_date;
    if (!editing && open && suggested) {
      setForm((prev) => (prev.open_date ? prev : { ...prev, open_date: suggested.slice(0, 10) }));
    }
  }, [suggestedOpenDate.data, editing, open]);

  const createMut = useMutation({
    mutationFn: (body: { name: string; target_month: number; target_year: number; start_date: string; end_date: string; quota: number }) =>
      batchPosService.create(body),
    onSuccess: () => {
      toast.success("Batch PO created");
      qc.invalidateQueries({ queryKey: ["batch-pos"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

  // For edit we reuse updateStatus or a generic PUT — currently the API has
  // PUT /batch-pos/:id for full updates, so we call batchPosService.create as a
  // workaround by directly calling api.put via the same pattern.
  // We expose an `update` method via the service, and add it inline here.
  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof batchPosService.update>[1]) =>
      batchPosService.update(editing!.id, body),
    onSuccess: () => {
      toast.success("Batch PO updated");
      qc.invalidateQueries({ queryKey: ["batch-pos"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

  const saving = createMut.isPending || updateMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.target_month) return toast.error("Target Month is required");
    if (!form.target_year) return toast.error("Target Year is required");
    if (!form.start_date) return toast.error("Start date is required");
    if (!form.end_date) return toast.error("End date is required");
    if (!form.open_date) return toast.error("Open date is required");
    if (!form.close_date) return toast.error("Close date is required");
    if (new Date(form.open_date) > new Date(form.close_date)) {
      return toast.error("Open date tidak boleh setelah close date");
    }
    if (!form.quota || Number(form.quota) <= 0) return toast.error("Quota must be greater than 0");

    const body = {
      name: form.name.trim(),
      target_month: Number(form.target_month),
      target_year: Number(form.target_year),
      open_date: new Date(form.open_date).toISOString(), // BARU
      close_date: new Date(form.close_date).toISOString(), // BARU
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      quota: Number(form.quota),
    };

    if (editing) {
      updateMut.mutate(body);
    } else {
      createMut.mutate(body);
    }
  }

  const set = (k: keyof BatchPOForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Batch PO" : "New Batch PO"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update batch production order details." : "Create a new production batch."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="bpo-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bpo-name"
                placeholder="e.g. PO Juni 2026"
                value={form.name}
                onChange={set("name")}
                autoFocus
              />
            </div>

            {/* Target Month & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bpo-target-month">
                  Target Month <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.target_month ? form.target_month.toString() : ""}
                  onValueChange={(val) => setForm((p) => ({ ...p, target_month: Number(val) }))}
                >
                  <SelectTrigger id="bpo-target-month">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2000, i, 1).toLocaleString("id-ID", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpo-target-year">
                  Target Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bpo-target-year"
                  type="number"
                  placeholder="e.g. 2026"
                  value={form.target_year}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      target_year: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                />
              </div>
            </div>

            {/* Quota */}
            <div className="space-y-2">
              <Label htmlFor="bpo-quota">
                Quota (units) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bpo-quota"
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={form.quota}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    quota: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              />
            </div>

            {/* Jendela Buka-Tutup PO */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bpo-open">
                  Open Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bpo-open"
                  type="date"
                  value={form.open_date}
                  onChange={set("open_date")}
                />
                <p className="text-xs text-muted-foreground">
                  Kapan PO ini mulai bisa menerima order.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpo-close">
                  Close Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bpo-close"
                  type="date"
                  value={form.close_date}
                  onChange={set("close_date")}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Otomatis = Start Date (tanggal mulai kerja).
                </p>
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bpo-start">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bpo-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({ ...prev, start_date: val, close_date: val })); // sinkron otomatis
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpo-end">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bpo-end"
                  type="date"
                  value={form.end_date}
                  onChange={set("end_date")}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Batch PO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Toggle Dialog ─────────────────────────────────────────────────────

function StatusDialog({
  open,
  batch,
  onClose,
}: {
  open: boolean;
  batch: BatchPO | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    if (batch) setNewStatus(batch.status);
  }, [batch]);

  const statusMut = useMutation({
    mutationFn: (status: string) => batchPosService.updateStatus(batch!.id, status),
    onSuccess: () => {
      toast.success(`Batch PO status updated to "${newStatus}"`);
      qc.invalidateQueries({ queryKey: ["batch-pos"] });
      qc.invalidateQueries({ queryKey: ["batch-pos", "active"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Update status for <strong>{batch?.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {newStatus === "closed" && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
              ⚠ Closing this batch will prevent new orders from being added (non-admin users).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => statusMut.mutate(newStatus)}
            disabled={statusMut.isPending || newStatus === batch?.status}
          >
            {statusMut.isPending ? "Updating…" : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function BatchPOsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BatchPO | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<BatchPO | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["batch-pos", "list", { page, limit }],
    queryFn: () => batchPosService.list({ page, limit }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => batchPosService.delete(id),
    onSuccess: () => {
      toast.success("Batch PO deleted");
      qc.invalidateQueries({ queryKey: ["batch-pos"] });
    },
    onError: (e: any) => toast.error(e?.payload?.error || e.message),
  });

  const batches = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(b: BatchPO) {
    setEditing(b);
    setDialogOpen(true);
  }
  function openStatus(b: BatchPO) {
    setStatusTarget(b);
    setStatusDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Batch PO</h1>
          <p className="text-sm text-muted-foreground">
            Manage production batch purchase orders. All new orders must be tied to an active batch.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Batch PO
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && batches.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(["draft", "active", "closed"] as const).map((s) => {
            const count = batches.filter((b) => b.status === s).length;
            return (
              <Card key={s} className="border-border/60">
                <CardContent className="flex items-center gap-3 p-4">
                  <Layers className={`h-8 w-8 rounded-md p-1.5 ${s === "active" ? "bg-emerald-100 text-emerald-700" :
                    s === "closed" ? "bg-rose-100 text-rose-700" :
                      "bg-slate-100 text-slate-700"
                    }`} />
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{s} Batches</p>
                    <p className="text-xl font-semibold">{count}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Batch POs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Edisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Quota</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Created</TableHead>
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
                  <TableCell colSpan={8} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load Batch POs"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium">No Batch POs found</p>
                      <p className="text-xs">Create your first batch to start accepting orders.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    {b.target_month && b.target_year
                      ? `${new Date(2000, b.target_month - 1, 1).toLocaleString("id-ID", { month: "long" })} ${b.target_year}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <BatchStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.quota.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(b.start_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(b.end_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(b.open_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(b.close_date)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(b.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {/* Toggle Status */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Change status"
                        onClick={() => openStatus(b)}
                      >
                        {b.status === "active" ? (
                          <ToggleRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Edit"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete batch "${b.name}"? This cannot be undone.`))
                            deleteMut.mutate(b.id);
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

      {/* Pagination */}
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

      {/* Dialogs */}
      <BatchPODialog
        open={dialogOpen}
        editing={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
      <StatusDialog
        open={statusDialogOpen}
        batch={statusTarget}
        onClose={() => {
          setStatusDialogOpen(false);
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
