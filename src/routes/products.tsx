import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productsService, categoriesService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — SIKOn ERP" },
      { name: "description", content: "Manage product catalog." },
    ],
  }),
  component: ProductsPage,
});

interface FormState {
  name: string;
  price: string;
  category_id: string;
  description: string;
}

const emptyForm: FormState = { name: "", price: "", category_id: "", description: "" };

function ProductsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", { page, limit }],
    queryFn: () => productsService.list({ page, limit }),
  });

  const { data: catData } = useQuery({
    queryKey: ["categories", { page: 1, limit: 100 }],
    queryFn: () => categoriesService.list({ page: 1, limit: 100 }),
  });
  const categories = catData?.data ?? [];

  const createMut = useMutation({
    mutationFn: (body: Partial<Product>) => productsService.create(body),
    onSuccess: () => {
      toast.success("Product created");
      qc.invalidateQueries({ queryKey: ["products"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Product> }) =>
      productsService.update(id, body),
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name ?? "",
        price: String(editing.price ?? ""),
        category_id: editing.category_id ?? editing.category?.id ?? "",
        description: editing.description ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setOpen(true);
  }
  function closeDialog() {
    setOpen(false);
    setEditing(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) return toast.error("Name is required");
    if (!Number.isFinite(price) || price < 0) return toast.error("Valid price required");
    if (!form.category_id) return toast.error("Category is required");

    const body: Partial<Product> = {
      name,
      price,
      category_id: form.category_id,
      description: form.description.trim() || undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, body });
    } else {
      createMut.mutate(body);
    }
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Master data: products catalog and pricing.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Product
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Loading products…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.category?.name ??
                      categories.find((c) => c.id === p.category_id)?.name ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatIDR(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete product "${p.name}"?`)) deleteMut.mutate(p.id);
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

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update product details." : "Add a new product to your catalog."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prod-name">Name</Label>
                <Input
                  id="prod-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Polo Shirt Premium"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-price">Price (IDR)</Label>
                  <Input
                    id="prod-price"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prod-category">Category</Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger id="prod-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No categories yet
                        </div>
                      )}
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-desc">Description</Label>
                <Textarea
                  id="prod-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes about this product"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
