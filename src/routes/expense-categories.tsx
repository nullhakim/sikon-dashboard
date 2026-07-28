import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { expenseCategoriesService } from "@/lib/services";

export const Route = createFileRoute("/expense-categories")({
  head: () => ({
    meta: [
      { title: "Expense Categories — SIKOn ERP" },
      { name: "description", content: "Manage expense categories." },
    ],
  }),
  component: ExpenseCategoriesPage,
});

const typeStyles: Record<string, string> = {
  HPP: "bg-blue-100 text-blue-700 border-blue-200",
  OPEX: "bg-amber-100 text-amber-700 border-amber-200",
};

function TypeBadge({ type }: { type: string }) {
  const cls = typeStyles[type?.toUpperCase()] ?? "bg-muted text-foreground border-border";
  return <Badge variant="outline" className={cls}>{type}</Badge>;
}

interface CategoryForm { name: string; type: string; description: string }
const emptyForm: CategoryForm = { name: "", type: "", description: "" };

function AddCategoryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const createMut = useMutation({
    mutationFn: (body: { name: string; type: string; description?: string }) =>
      expenseCategoriesService.create(body),
    onSuccess: () => {
      toast.success("Expense category created");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
      setForm(emptyForm);
      onClose();
    },
    onError: (e: any) => toast.error(e?.payload?.message || e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.type) return toast.error("Type is required");
    createMut.mutate({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm(emptyForm); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Expense Category</DialogTitle>
            <DialogDescription>Add a new expense category for classifying costs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ec-name">Name <span className="text-destructive">*</span></Label>
              <Input id="ec-name" placeholder="e.g. Bahan Baku Kain" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-type">Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(val) => setForm((p) => ({ ...p, type: val }))}>
                <SelectTrigger id="ec-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HPP">HPP (Cost of Goods Sold)</SelectItem>
                  <SelectItem value="OPEX">OPEX (Operational Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-desc">Description</Label>
              <Textarea id="ec-desc" placeholder="Optional description…" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setForm(emptyForm); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Saving…" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseCategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoriesService.list(),
  });
  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Categories</h1>
          <p className="text-sm text-muted-foreground">Master data for classifying expenses into HPP or OPEX.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Category</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All Expense Categories</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
              {isError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load categories"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    <div className="space-y-1">
                      <p className="font-medium">No expense categories yet</p>
                      <p className="text-xs">Create your first category to start tracking expenses.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><TypeBadge type={c.type} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.description || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddCategoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
