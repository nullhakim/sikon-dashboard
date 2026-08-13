import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { specTemplatesService, type SpecTemplatePayload } from "@/lib/services";
import { formatDate } from "@/lib/format";
import type { SpecTemplate } from "@/lib/types";

export const Route = createFileRoute("/material-catalogs")({
  head: () => ({
    meta: [
      { title: "Material Catalogs — SIKOn ERP" },
      { name: "description", content: "Manage material specification templates." },
    ],
  }),
  component: MaterialCatalogsPage,
});

interface FormState {
  name: string;
  spec: string;
  description: string;
  composition: string;
  care_instruction: string;
}

const emptyForm: FormState = {
  name: "", spec: "", description: "", composition: "", care_instruction: "",
};

function MaterialCatalogsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SpecTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["spec-templates", { page, limit }],
    queryFn: () => specTemplatesService.list({ page, limit }),
  });

  const createMut = useMutation({
    mutationFn: (body: SpecTemplatePayload) => specTemplatesService.create(body),
    onSuccess: () => { toast.success("Material catalog created"); qc.invalidateQueries({ queryKey: ["spec-templates"] }); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: SpecTemplatePayload }) => specTemplatesService.update(id, body),
    onSuccess: () => { toast.success("Material catalog updated"); qc.invalidateQueries({ queryKey: ["spec-templates"] }); closeDialog(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => specTemplatesService.delete(id),
    onSuccess: () => { toast.success("Material catalog deleted"); qc.invalidateQueries({ queryKey: ["spec-templates"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }

  function openEdit(c: SpecTemplate) {
    setEditing(c);
    setForm({ name: c.name, spec: c.spec, description: c.description ?? "", composition: c.composition ?? "", care_instruction: c.care_instruction ?? "" });
    setOpen(true);
  }

  function closeDialog() { setOpen(false); setEditing(null); setForm(emptyForm); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedSpec = form.spec.trim();
    if (!trimmedName) return toast.error("Name is required");
    if (!trimmedSpec) return toast.error("Spec (deskripsi singkat) is required");
    const payload: SpecTemplatePayload = {
      name: trimmedName,
      spec: trimmedSpec,
      description: form.description.trim() || undefined,
      composition: form.composition.trim() || undefined,
      care_instruction: form.care_instruction.trim() || undefined,
    };
    if (editing) { updateMut.mutate({ id: editing.id, body: payload }); }
    else { createMut.mutate(payload); }
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Material Catalogs</h1>
          <p className="text-sm text-muted-foreground">Manage material specification templates for easy reference.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New Catalog</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> All Material Catalogs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Name</TableHead>
                <TableHead className="w-[25%]">Spec (Singkat)</TableHead>
                <TableHead className="w-[20%]">Komposisi</TableHead>
                <TableHead>Instruksi Perawatan</TableHead>
                <TableHead className="w-[12%]">Created</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading material catalogs…</TableCell></TableRow>}
              {isError && <TableRow><TableCell colSpan={6} className="py-8 text-center text-destructive">{(error as Error)?.message ?? "Failed to load"}</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No material catalogs found.</TableCell></TableRow>}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div>{c.name}</div>
                    {c.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.spec}</TableCell>
                  <TableCell>
                    {c.composition
                      ? <Badge variant="outline" className="text-[10px] font-normal">{c.composition}</Badge>
                      : <span className="text-xs text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.care_instruction || <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Delete material catalog "${c.name}"?`)) deleteMut.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {page} of {totalPage}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPage} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Catalog" : "New Catalog"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update material catalog details." : "Tambahkan template spesifikasi kain baru ke Master Katalog Global."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name <span className="text-destructive">*</span></Label>
                <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. American Drill" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-spec">Spec / Deskripsi Singkat <span className="text-destructive">*</span></Label>
                <Textarea id="cat-spec" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} placeholder="e.g. Tekstur miring sedang, menyerap keringat dengan baik." rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-composition">Komposisi</Label>
                <Input id="cat-composition" value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} placeholder="e.g. 65% Polyester / 35% Viscose" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-care">Instruksi Perawatan</Label>
                <Input id="cat-care" value={form.care_instruction} onChange={(e) => setForm({ ...form, care_instruction: e.target.value })} placeholder="e.g. Setrika suhu sedang, jangan gunakan pemutih." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-description">Deskripsi Lengkap <span className="text-xs text-muted-foreground font-normal">(Opsional)</span></Label>
                <Textarea id="cat-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi detail tentang karakteristik kain ini..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
