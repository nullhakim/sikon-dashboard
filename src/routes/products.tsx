import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
import { productsService, categoriesService, uploadService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";

const searchSchema = z.object({
  search: z.string().optional().catch(""),
  category_id: z.string().optional().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(10),
});

export const Route = createFileRoute("/products")({
  validateSearch: searchSchema,
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
  base_price: string;
  category_id: string;
  description: string;
  image_urls: string[];
  image_files: File[];
}

const emptyForm: FormState = { name: "", base_price: "", category_id: "", description: "", image_urls: [], image_files: [] };

function ProductsPage() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [searchInput, setSearchInput] = useState(searchParams.search || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (searchParams.search || "")) {
        navigate({
          search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
        });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchInput, navigate, searchParams.search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", searchParams],
    queryFn: () => productsService.list(searchParams),
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
      const urls = editing.images?.map(img => img.image_url) || [];

      setForm({
        name: editing.name ?? "",
        base_price: String(editing.base_price ?? ""),
        category_id: editing.category_id ?? editing.category?.id ?? "",
        description: editing.description ?? "",
        image_urls: urls,
        image_files: [],
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const base_price = Number(form.base_price);
    if (!name) return toast.error("Name is required");
    if (!Number.isFinite(base_price) || base_price < 0)
      return toast.error("Valid base_price required");
    if (!form.category_id) return toast.error("Category is required");

    let finalImageUrls = [...form.image_urls];
    if (form.image_files.length > 0) {
      try {
        setUploadingImage(true);
        const uploadPromises = form.image_files.map(file => uploadService.image(file, "products"));
        const uploadRes = await Promise.all(uploadPromises);
        const newUrls = uploadRes.map(res => res.data.url);
        finalImageUrls = [...finalImageUrls, ...newUrls];
      } catch (err: any) {
        setUploadingImage(false);
        return toast.error(err.message || "Failed to upload images");
      }
      setUploadingImage(false);
    }

    const body: Partial<Product> = {
      name,
      base_price,
      category_id: form.category_id,
      description: form.description.trim() || undefined,
      image_urls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, body });
    } else {
      createMut.mutate(body);
    }
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const hasNextPage = data?.paging?.total_page
    ? searchParams.page < data.paging.total_page
    : rows.length === searchParams.limit;
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={searchParams.category_id || "all"}
          onValueChange={(val) => {
            navigate({
              search: (prev) => ({
                ...prev,
                category_id: val === "all" ? undefined : val,
                page: 1,
              }),
            });
          }}
        >
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
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
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No products found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {(() => {
                      const firstImageUrl = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url;
                      return firstImageUrl ? (
                        <img
                          src={firstImageUrl}
                          alt={p.name}
                          className="h-10 w-10 rounded-md object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewProduct(p)}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.category?.name ??
                      categories.find((c) => c.id === p.category_id)?.name ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatIDR(p.base_price)}
                  </TableCell>
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
          Page {searchParams.page} of {totalPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={searchParams.page <= 1}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }) })}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}
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
                  <Label htmlFor="prod-base_price">Price (IDR)</Label>
                  <Input
                    id="prod-base_price"
                    type="number"
                    min={0}
                    step={1000}
                    value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
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
                <Label>Product Images</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    {form.image_urls.map((url, i) => (
                      <div key={`url-${i}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border group">
                        <img src={url} alt="Preview" className="h-full w-full object-cover bg-muted/20" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newUrls = [...form.image_urls];
                              newUrls.splice(i, 1);
                              setForm({ ...form, image_urls: newUrls });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {form.image_files.map((file, i) => (
                      <div key={`file-${i}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border group">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover bg-muted/20" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newFiles = [...form.image_files];
                              newFiles.splice(i, 1);
                              setForm({ ...form, image_files: newFiles });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:bg-muted/50 hover:border-muted-foreground/50">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) setForm({ ...form, image_files: [...form.image_files, ...files] });
                          e.target.value = "";
                        }}
                      />
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground/50" />
                      <span className="text-[10px] font-medium text-muted-foreground">Upload</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Upload one or more images for this product. <br />
                      Recommended: Square (1:1 ratio), up to 2MB per image.
                    </p>
                  </div>
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
              <Button type="submit" disabled={saving || uploadingImage}>
                {uploadingImage ? "Uploading…" : saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewProduct} onOpenChange={(v) => !v && setPreviewProduct(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 bg-transparent border-none shadow-none">
          {(() => {
            if (!previewProduct) return null;
            const urls = previewProduct.images?.map((img) => img.image_url) || previewProduct.image_urls || [];
            if (urls.length === 0) return null;

            if (urls.length === 1) {
              return (
                <img
                  src={urls[0]}
                  alt={previewProduct.name}
                  className="w-full h-auto max-h-[80vh] rounded-md object-contain bg-black/50"
                />
              );
            }

            return (
              <Carousel className="w-full max-w-full group">
                <CarouselContent>
                  {urls.map((url, i) => (
                    <CarouselItem key={i} className="flex items-center justify-center">
                      <img
                        src={url}
                        alt={previewProduct.name}
                        className="w-full h-auto max-h-[80vh] rounded-md object-contain bg-black/50"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-black/50 hover:bg-black/75 text-white border-none opacity-0 transition-opacity group-hover:opacity-100" />
                <CarouselNext className="right-4 bg-black/50 hover:bg-black/75 text-white border-none opacity-0 transition-opacity group-hover:opacity-100" />
              </Carousel>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
