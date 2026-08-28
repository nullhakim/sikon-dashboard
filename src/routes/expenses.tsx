import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination-custom";

import {
  expensesService, expenseCategoriesService, batchPosService, usersService,
} from "@/lib/services";
import { formatDate, formatIDR } from "@/lib/format";
import type { Expense } from "@/lib/types/expense";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/expenses")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) > 0 ? Number(search.page) : 1,
    limit: Number(search.limit) > 0 ? Number(search.limit) : 10,
    start_date: typeof search.start_date === "string" ? search.start_date : "",
    end_date: typeof search.end_date === "string" ? search.end_date : "",
    po_id: typeof search.po_id === "string" ? search.po_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Expenses — SIKOn ERP" },
      { name: "description", content: "Track and manage business expenses." },
    ],
  }),
  component: ExpensesPage,
});

// ─── Add Expense Dialog ──────────────────────────────────────────────────────

interface ExpenseForm {
  title: string;
  amount: string;
  expense_date: string;
  expense_category_id: string;
  batch_po_id: string;
  notes: string;
}

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

const emptyForm: ExpenseForm = {
  title: "",
  amount: "",
  expense_date: getTodayDateStr(),
  expense_category_id: "",
  batch_po_id: "",
  notes: "",
};

function AddExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  // Fetch dropdown options
  const { data: catData } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoriesService.list(),
    enabled: open,
  });
  const { data: poData } = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
    enabled: open,
  });

  const categories = catData?.data ?? [];
  const activePOs = poData?.data ?? [];

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof expensesService.create>[0]) =>
      expensesService.create(body),
    onSuccess: () => {
      toast.success("Expense recorded successfully");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setForm(emptyForm);
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return toast.error("User session invalid. Please log in again.");
    if (!form.expense_category_id) return toast.error("Category is required");
    if (!form.title.trim()) return toast.error("Title is required");
    const numAmount = Number(form.amount) || 0;
    if (numAmount <= 0) return toast.error("Amount must be > 0");
    if (!form.expense_date) return toast.error("Date is required");

    createMut.mutate({
      title: form.title.trim(),
      amount: numAmount,
      expense_date: new Date(form.expense_date).toISOString(),
      expense_category_id: form.expense_category_id,
      batch_po_id: form.batch_po_id || undefined,
      created_by_id: user.id,
      notes: form.notes.trim() || undefined,
    });
  }

  const set = (k: keyof ExpenseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm(emptyForm); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
            <DialogDescription>Record a new business expense.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="exp-cat">Category <span className="text-destructive">*</span></Label>
              <Select value={form.expense_category_id} onValueChange={(v) => setForm((p) => ({ ...p, expense_category_id: v }))}>
                <SelectTrigger id="exp-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="exp-title">Title <span className="text-destructive">*</span></Label>
              <Input id="exp-title" placeholder="e.g. Pembelian Kain / Listrik / Perlengkapan" value={form.title} onChange={set("title")} autoFocus />
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exp-amount">Amount (Rp) <span className="text-destructive">*</span></Label>
                <Input id="exp-amount" type="number" min={0} placeholder="0" value={form.amount} onChange={set("amount")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">Date <span className="text-destructive">*</span></Label>
                <Input id="exp-date" type="date" value={form.expense_date} onChange={set("expense_date")} />
              </div>
            </div>

            {/* Batch PO */}
            <div className="space-y-2">
              <Label htmlFor="exp-po">Batch PO <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Select value={form.batch_po_id} onValueChange={(v) => setForm((p) => ({ ...p, batch_po_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger id="exp-po"><SelectValue placeholder="No batch PO" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {activePOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>{po.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea id="exp-notes" placeholder="Optional notes…" value={form.notes} onChange={set("notes")} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ExpensesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const { page, limit, start_date, end_date, po_id } = search;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const setFilter = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace: true });

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p }), replace: true });

  const setLimit = (l: number) =>
    navigate({ search: (prev) => ({ ...prev, limit: l, page: 1 }), replace: true });

  // Fetch active POs for filter dropdown
  const { data: poData } = useQuery({
    queryKey: ["batch-pos", "active"],
    queryFn: () => batchPosService.active(),
  });
  const activePOs = poData?.data ?? [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["expenses", "list", { page, limit, start_date, end_date, po_id }],
    queryFn: () => expensesService.list({
      page,
      limit,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      po_id: po_id || undefined,
    }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesService.delete(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  const rows = data?.data ?? [];
  const totalData = (data?.paging as any)?.total_item ?? (data?.paging as any)?.total_data ?? rows.length;
  const totalPage = data?.paging?.total_page ?? 1;

  const hasAnyFilter = !!(start_date || end_date || po_id);

  function clearFilters() {
    navigate({ search: () => ({ page: 1, limit, start_date: "", end_date: "", po_id: "" }), replace: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage business expenses.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input type="date" className="w-40" value={start_date} onChange={(e) => setFilter({ start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input type="date" className="w-40" value={end_date} onChange={(e) => setFilter({ end_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Batch PO</Label>
              <Select value={po_id || "__all__"} onValueChange={(v) => setFilter({ po_id: v === "__all__" ? "" : v })}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All POs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All POs</SelectItem>
                  {activePOs.map((po) => (
                    <SelectItem key={po.id} value={po.id}>{po.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardTitle className="text-base">Expense Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Batch PO</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load expenses"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium">No expenses found</p>
                      <p className="text-xs">Record your first expense to get started.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(exp.expense_date)}
                  </TableCell>
                  <TableCell className="font-medium">{exp.title}</TableCell>
                  <TableCell className="text-sm">{exp.category_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{exp.batch_po_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatIDR(exp.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{exp.creator_name ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete" onClick={() => setDeleteTarget(exp)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Add Expense Dialog */}
      <AddExpenseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
