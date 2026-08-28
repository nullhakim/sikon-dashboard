import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Calendar, Filter, Pencil, Trash2, Lock, CheckCircle2 } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { attendancesService, workersService } from "@/lib/services";
import { formatDate, formatIDR } from "@/lib/format";
import type { Attendance, AttendanceStatus, Worker } from "@/lib/types/payroll";

export const Route = createFileRoute("/attendances")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    limit: Number(search.limit) > 0 ? Number(search.limit) : 10,
    start_date: typeof search.start_date === "string" ? search.start_date : "",
    end_date: typeof search.end_date === "string" ? search.end_date : "",
    worker_id: typeof search.worker_id === "string" ? search.worker_id : "",
    status: typeof search.status === "string" ? search.status : "",
    is_unpaid: search.is_unpaid === "true" || search.is_unpaid === true,
  }),
  head: () => ({
    meta: [
      { title: "Attendances — SIKOn ERP" },
      { name: "description", content: "Pencatatan presensi dan kehadiran harian pekerja harian/staf." },
    ],
  }),
  component: AttendancesPage,
});

// Status Config
const ATTENDANCE_STATUS_MAP: Record<AttendanceStatus, { label: string; index: number; className: string }> = {
  present: { label: "Present (Hadir - 1.0)", index: 1.0, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  half_day: { label: "Half Day (Setengah Hari - 0.5)", index: 0.5, className: "bg-amber-100 text-amber-800 border-amber-200" },
  permission: { label: "Permission (Izin - 0.0)", index: 0.0, className: "bg-blue-100 text-blue-800 border-blue-200" },
  alpha: { label: "Alpha (Tanpa Keterangan - 0.0)", index: 0.0, className: "bg-rose-100 text-rose-800 border-rose-200" },
};

const DEFAULT_STATUS_INDEX: Record<AttendanceStatus, number> = {
  present: 1.0,
  half_day: 0.5,
  permission: 0.0,
  alpha: 0.0,
};

// ─── Single Attendance Modal ──────────────────────────────────────────────────
function SingleAttendanceModal({
  open,
  target,
  workers,
  onClose,
}: {
  open: boolean;
  target: Attendance | null;
  workers: Worker[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!target;

  const todayStr = new Date().toISOString().split("T")[0];
  const [workerId, setWorkerId] = useState(target?.worker_id || "");
  const [date, setDate] = useState(target?.attendance_date || todayStr);
  const [status, setStatus] = useState<AttendanceStatus>(target?.status || "present");
  const [durationIndex, setDurationIndex] = useState<string>(
    target?.work_duration_index != null ? String(target.work_duration_index) : "1.0"
  );
  const [notes, setNotes] = useState(target?.notes || "");

  const saveMut = useMutation({
    mutationFn: (body: any) =>
      isEdit ? attendancesService.update(target.id, body) : attendancesService.create(body),
    onSuccess: () => {
      toast.success(isEdit ? "Attendance updated" : "Attendance recorded");
      qc.invalidateQueries({ queryKey: ["attendances"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workerId) return toast.error("Please select a worker");
    if (!date) return toast.error("Please select a date");

    saveMut.mutate({
      worker_id: workerId,
      attendance_date: date,
      status,
      work_duration_index: durationIndex ? Number(durationIndex) : DEFAULT_STATUS_INDEX[status],
      notes: notes || undefined,
    });
  }

  function handleStatusChange(val: AttendanceStatus) {
    setStatus(val);
    setDurationIndex(String(DEFAULT_STATUS_INDEX[val]));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Absen Individu" : "Catat Absen Individu"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Ubah data presensi pekerja." : "Input presensi tunggal untuk pekerja harian/staf."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="att-worker">Worker <span className="text-destructive">*</span></Label>
              <Select value={workerId} onValueChange={setWorkerId} disabled={isEdit}>
                <SelectTrigger id="att-worker"><SelectValue placeholder="Pilih Pekerja" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.role}) {w.daily_rate ? `— ${formatIDR(w.daily_rate)}/hari` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="att-date">Tanggal Absensi <span className="text-destructive">*</span></Label>
              <Input
                id="att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="att-status">Status Absensi <span className="text-destructive">*</span></Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger id="att-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present (Hadir - 1.0)</SelectItem>
                  <SelectItem value="half_day">Half Day (Setengah Hari - 0.5)</SelectItem>
                  <SelectItem value="permission">Permission (Izin - 0.0)</SelectItem>
                  <SelectItem value="alpha">Alpha (Tanpa Keterangan - 0.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="att-duration">Work Duration Index</Label>
              <Input
                id="att-duration"
                type="number"
                step="0.1"
                min="0"
                max="2.0"
                value={durationIndex}
                onChange={(e) => setDurationIndex(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="att-notes">Catatan / Notes</Label>
              <Input
                id="att-notes"
                placeholder="misal: Lembur 1 jam / Pulang cepat"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? "Menyimpan…" : isEdit ? "Update Absensi" : "Simpan Absensi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Attendance Modal ───────────────────────────────────────────────────
interface BatchWorkerItem {
  worker_id: string;
  worker_name: string;
  worker_role: string;
  daily_rate?: number;
  status: AttendanceStatus;
  work_duration_index: number;
  notes: string;
}

function BatchAttendanceModal({
  open,
  workers,
  onClose,
}: {
  open: boolean;
  workers: Worker[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const todayStr = new Date().toISOString().split("T")[0];
  const [attendanceDate, setAttendanceDate] = useState(todayStr);

  // Initialize batch items with active daily workers (or all active if none daily)
  const activeWorkers = workers.filter((w) => w.status === "active");
  const dailyWorkers = activeWorkers.filter((w) => w.salary_type === "daily");
  const targetWorkers = dailyWorkers.length > 0 ? dailyWorkers : activeWorkers;

  const [items, setItems] = useState<BatchWorkerItem[]>(() =>
    targetWorkers.map((w) => ({
      worker_id: w.id,
      worker_name: w.name,
      worker_role: w.role,
      daily_rate: w.daily_rate,
      status: "present",
      work_duration_index: 1.0,
      notes: "",
    }))
  );

  const batchMut = useMutation({
    mutationFn: (body: any) => attendancesService.createBatch(body),
    onSuccess: (res) => {
      toast.success("Berhasil mencatat absensi masal harian!");
      qc.invalidateQueries({ queryKey: ["attendances"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function updateItem(workerId: string, patch: Partial<BatchWorkerItem>) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.worker_id === workerId) {
          const updated = { ...it, ...patch };
          if (patch.status && patch.work_duration_index === undefined) {
            updated.work_duration_index = DEFAULT_STATUS_INDEX[patch.status];
          }
          return updated;
        }
        return it;
      })
    );
  }

  function handleSubmit() {
    if (!attendanceDate) return toast.error("Tentukan tanggal absensi");
    if (items.length === 0) return toast.error("Tidak ada pekerja yang dipilih");

    batchMut.mutate({
      attendance_date: attendanceDate,
      items: items.map((i) => ({
        worker_id: i.worker_id,
        status: i.status,
        work_duration_index: i.work_duration_index,
        notes: i.notes || undefined,
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Absen Masal Hari Ini (Batch Attendance)</DialogTitle>
          <DialogDescription>
            Pencatatan presensi sekaligus untuk seluruh pekerja harian / staf aktif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="w-48 space-y-1">
            <Label htmlFor="batch-date">Tanggal Absensi <span className="text-destructive">*</span></Label>
            <Input
              id="batch-date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>

          <div className="border rounded-md overflow-hidden text-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-1/3">Nama Pekerja & Role</TableHead>
                  <TableHead className="w-1/3">Status Kehadiran</TableHead>
                  <TableHead>Catatan (Opsional)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Tidak ada data pekerja harian aktif.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.worker_id}>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{item.worker_name}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {item.worker_role} {item.daily_rate ? `• ${formatIDR(item.daily_rate)}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(val: AttendanceStatus) => updateItem(item.worker_id, { status: val })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Hadir (1.0)</SelectItem>
                          <SelectItem value="half_day">Setengah Hari (0.5)</SelectItem>
                          <SelectItem value="permission">Izin (0.0)</SelectItem>
                          <SelectItem value="alpha">Alpha (0.0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Catatan..."
                        value={item.notes}
                        onChange={(e) => updateItem(item.worker_id, { notes: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" disabled={batchMut.isPending} onClick={handleSubmit}>
            {batchMut.isPending ? "Menyimpan…" : "Simpan Absensi Masal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
function AttendancesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { page, limit, start_date, end_date, worker_id, status, is_unpaid } = search;

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Attendance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attendance | null>(null);

  const setFilter = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }), replace: true });

  const setLimit = (l: number) =>
    navigate({ search: (prev) => ({ ...prev, limit: l, page: 1 }), replace: true });

  // Fetch workers for dropdowns
  const { data: workersData } = useQuery({
    queryKey: ["workers", "all-select"],
    queryFn: () => workersService.list({ limit: 100 }),
  });
  const workers = workersData?.data ?? [];

  // Fetch Attendances
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attendances", "list", { page, limit, start_date, end_date, worker_id, status, is_unpaid }],
    queryFn: () => attendancesService.list({
      page,
      limit,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      worker_id: worker_id || undefined,
      status: status || undefined,
      is_unpaid: is_unpaid || undefined,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => attendancesService.delete(id),
    onSuccess: () => {
      toast.success("Data absensi telah dihapus");
      qc.invalidateQueries({ queryKey: ["attendances"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const rows = data?.data ?? [];
  const totalData = (data as any)?.paging?.total_item ?? (data as any)?.meta?.total_items ?? rows.length;
  const totalPage = (data as any)?.paging?.total_page ?? (data as any)?.meta?.total_pages ?? 1;

  const hasAnyFilter = !!(start_date || end_date || worker_id || status || is_unpaid);

  function clearFilters() {
    navigate({ search: () => ({ page: 1, limit, start_date: "", end_date: "", worker_id: "", status: "", is_unpaid: false }), replace: true });
  }

  function handleOpenSingleAdd() {
    setEditTarget(null);
    setSingleModalOpen(true);
  }

  function handleOpenSingleEdit(att: Attendance) {
    setEditTarget(att);
    setSingleModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendances / Absensi Pekerja</h1>
          <p className="text-sm text-muted-foreground">
            Pencatatan presensi dan kehadiran harian pekerja harian/staf.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleOpenSingleAdd}>
            <Plus className="mr-1 h-4 w-4" /> Catat Absen Individu
          </Button>
          <Button onClick={() => setBatchModalOpen(true)}>
            <Users className="mr-1 h-4 w-4" /> Absen Masal Hari Ini
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                className="w-36"
                value={start_date}
                onChange={(e) => setFilter({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                className="w-36"
                value={end_date}
                onChange={(e) => setFilter({ end_date: e.target.value })}
              />
            </div>

            <div className="space-y-1 w-44">
              <Label className="text-xs text-muted-foreground">Worker</Label>
              <Select value={worker_id || "__all__"} onValueChange={(v) => setFilter({ worker_id: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Semua Pekerja" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Pekerja</SelectItem>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 w-44">
              <Label className="text-xs text-muted-foreground">Status Absen</Label>
              <Select value={status || "__all__"} onValueChange={(v) => setFilter({ status: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Status</SelectItem>
                  <SelectItem value="present">Present (Hadir)</SelectItem>
                  <SelectItem value="half_day">Half Day (Setengah Hari)</SelectItem>
                  <SelectItem value="permission">Permission (Izin)</SelectItem>
                  <SelectItem value="alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="is_unpaid"
                checked={is_unpaid}
                onCheckedChange={(c) => setFilter({ is_unpaid: !!c })}
              />
              <Label htmlFor="is_unpaid" className="text-xs font-semibold cursor-pointer">
                Belum Digaji Only
              </Label>
            </div>

            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendances Record</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Worker Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Daily Rate</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Payroll Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load attendances"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <p className="font-medium">Tidak ada catatan absensi yang ditemukan</p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((att) => {
                const sConf = ATTENDANCE_STATUS_MAP[att.status] || { label: att.status, className: "bg-slate-100 text-slate-700 border-slate-200" };
                const isLocked = !!att.payroll_id;

                return (
                  <TableRow key={att.id}>
                    <TableCell className="font-medium text-slate-800">
                      {formatDate(att.attendance_date)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{att.worker?.name || "Unknown Worker"}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {att.worker?.role || "Field Worker"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sConf.className}>
                        {sConf.label}
                      </Badge>
                      {att.notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">{att.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {formatIDR(att.daily_rate)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold tabular-nums text-slate-900">
                      {formatIDR(att.total_amount)}
                    </TableCell>
                    <TableCell>
                      {isLocked ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1 w-fit">
                          <Lock className="h-3 w-3" /> Terikat Payroll #{att.payroll_no || att.payroll_id}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
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
                          disabled={isLocked}
                          onClick={() => handleOpenSingleEdit(att)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={isLocked}
                          onClick={() => setDeleteTarget(att)}
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

      {/* Modals */}
      {singleModalOpen && (
        <SingleAttendanceModal
          open={singleModalOpen}
          target={editTarget}
          workers={workers}
          onClose={() => setSingleModalOpen(false)}
        />
      )}

      {batchModalOpen && (
        <BatchAttendanceModal
          open={batchModalOpen}
          workers={workers}
          onClose={() => setBatchModalOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Absensi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data absensi tanggal <strong>{formatDate(deleteTarget?.attendance_date)}</strong> untuk <strong>{deleteTarget?.worker?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? "Hapus…" : "Hapus Absensi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
