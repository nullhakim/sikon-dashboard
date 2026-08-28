import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, Link2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

import { workersService, usersService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import type { Worker, WorkerRole, SalaryType, WorkerStatus } from "@/lib/types/payroll";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/workers")({
  head: () => ({
    meta: [
      { title: "Workers — SIKOn ERP" },
      { name: "description", content: "Kelola master data pekerja lapangan dan tipe gaji." },
    ],
  }),
  component: WorkersPage,
});

// Role Badge styling
const ROLE_BADGE: Record<WorkerRole, { label: string; className: string }> = {
  tailor: { label: "Tailor", className: "bg-blue-100 text-blue-800 border-blue-200" },
  cutter: { label: "Cutter", className: "bg-amber-100 text-amber-800 border-amber-200" },
  finishing: { label: "Finishing", className: "bg-purple-100 text-purple-800 border-purple-200" },
  sales: { label: "Sales", className: "bg-green-100 text-green-800 border-green-200" },
  staff: { label: "Staff", className: "bg-teal-100 text-teal-800 border-teal-200" },
  helper: { label: "Helper", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

// Salary Type Badge styling
const SALARY_BADGE: Record<SalaryType, { label: string; className: string }> = {
  piece_rate: { label: "Borongan", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  daily: { label: "Harian", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  monthly: { label: "Bulanan", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
};

interface WorkerForm {
  name: string;
  phone: string;
  role: WorkerRole;
  salary_type: SalaryType;
  status: WorkerStatus;
  daily_rate: string;
  user_id: string;
}

const emptyForm: WorkerForm = {
  name: "",
  phone: "",
  role: "tailor",
  salary_type: "piece_rate",
  status: "active",
  daily_rate: "",
  user_id: "",
};

function WorkerModal({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: Worker | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<WorkerForm>(emptyForm);

  const isEdit = !!target;

  // Fetch users for linking dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users", "worker-link"],
    queryFn: () => usersService.list({ limit: 100 }),
    enabled: open,
  });
  const users = usersData?.data ?? [];

  // Sync form state when modal opens or target changes
  useEffect(() => {
    if (target) {
      setForm({
        name: target.name,
        phone: target.phone || "",
        role: target.role,
        salary_type: target.salary_type,
        status: target.status,
        daily_rate: target.daily_rate != null ? String(target.daily_rate) : "",
        user_id: target.user_id || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [target]);

  const saveMut = useMutation({
    mutationFn: (body: Parameters<typeof workersService.create>[0]) =>
      isEdit ? workersService.update(target.id, body) : workersService.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Worker updated successfully" : "Worker created successfully");
      qc.invalidateQueries({ queryKey: ["workers"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.salary_type === "daily" && (!form.daily_rate || Number(form.daily_rate) <= 0)) {
      return toast.error("Daily Rate wajib diisi jika Salary Type = Harian");
    }

    saveMut.mutate({
      name: form.name.trim(),
      phone: form.phone || undefined,
      role: form.role,
      salary_type: form.salary_type,
      status: form.status,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : undefined,
      user_id: form.user_id || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Worker" : "Add Worker"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update worker master details." : "Create a new field worker entry."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="w-name">Worker Name <span className="text-destructive">*</span></Label>
              <Input
                id="w-name"
                placeholder="e.g. Budi Santoso"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-phone">No. HP / Phone</Label>
              <Input
                id="w-phone"
                placeholder="e.g. 081234567890"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="w-role">Role <span className="text-destructive">*</span></Label>
                <Select
                  value={form.role}
                  onValueChange={(v: WorkerRole) => setForm((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger id="w-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tailor">Tailor (Penjahit)</SelectItem>
                    <SelectItem value="cutter">Cutter (Pemotong)</SelectItem>
                    <SelectItem value="finishing">Finishing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="helper">Helper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-salary">Salary Type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.salary_type}
                  onValueChange={(v: SalaryType) => setForm((p) => ({ ...p, salary_type: v }))}
                >
                  <SelectTrigger id="w-salary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece_rate">Borongan</SelectItem>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Daily Rate - shown always but required when salary_type=daily */}
            <div className="space-y-2">
              <Label htmlFor="w-daily-rate">
                Tarif Harian / Daily Rate (Rp)
                {form.salary_type === "daily" && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="w-daily-rate"
                type="number"
                placeholder="e.g. 66667"
                min="0"
                step="0.01"
                value={form.daily_rate}
                onChange={(e) => setForm((p) => ({ ...p, daily_rate: e.target.value }))}
              />
              {form.salary_type === "daily" && (
                <p className="text-[11px] text-muted-foreground">Wajib diisi untuk pekerja dengan tipe gaji Harian.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="w-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: WorkerStatus) => setForm((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger id="w-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w-user">
                  <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> Link Akun User</span>
                </Label>
                <Select
                  value={form.user_id || "__none__"}
                  onValueChange={(v) => setForm((p) => ({ ...p, user_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger id="w-user"><SelectValue placeholder="Tidak Ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tidak Ada —</SelectItem>
                    {users.map((u: User) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : isEdit ? "Update Worker" : "Save Worker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Worker | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workers", "list", { page, limit, search, roleFilter, salaryFilter, statusFilter }],
    queryFn: () => workersService.list({
      page,
      limit,
      search: search || undefined,
      role: roleFilter || undefined,
      salary_type: salaryFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => workersService.delete(id),
    onSuccess: () => {
      toast.success("Worker deleted");
      qc.invalidateQueries({ queryKey: ["workers"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;

  function handleOpenAdd() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function handleOpenEdit(w: Worker) {
    setEditTarget(w);
    setModalOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setSalaryFilter("");
    setStatusFilter("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground">
            Kelola master data pekerja lapangan dan tipe gaji.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add Worker
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama / no. HP…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Roles</SelectItem>
                  <SelectItem value="tailor">Tailor</SelectItem>
                  <SelectItem value="cutter">Cutter</SelectItem>
                  <SelectItem value="finishing">Finishing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="helper">Helper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-40">
              <Label className="text-xs text-muted-foreground">Salary Type</Label>
              <Select value={salaryFilter} onValueChange={(v) => { setSalaryFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Types</SelectItem>
                  <SelectItem value="piece_rate">Borongan</SelectItem>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-36">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "__all__" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(search || roleFilter || salaryFilter || statusFilter) && (
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
          <CardTitle className="text-base">Workers Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Salary Type</TableHead>
                <TableHead className="text-right">Daily Rate</TableHead>
                <TableHead>Status</TableHead>
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
                    {(error as Error)?.message ?? "Failed to load workers"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <p className="font-medium">No workers found</p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((w) => {
                const rBadge = ROLE_BADGE[w.role] || { label: w.role, className: "bg-slate-100 text-slate-700 border-slate-200" };
                const sBadge = SALARY_BADGE[w.salary_type];
                return (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.phone || "No phone"}
                        {w.user && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-blue-600">
                            <Link2 className="h-3 w-3" /> {w.user.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={rBadge.className}>{rBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sBadge.className}>{sBadge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {w.daily_rate != null && w.daily_rate > 0
                        ? formatIDR(w.daily_rate)
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.status === "active" ? "default" : "secondary"}>
                        {w.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(w)}>
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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {page} of {totalPage}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPage} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <WorkerModal
          open={modalOpen}
          target={editTarget}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete worker <strong>"{deleteTarget?.name}"</strong>?
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
