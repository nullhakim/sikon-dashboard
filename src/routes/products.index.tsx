import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search, Image as ImageIcon, Upload, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { productsService, categoriesService, uploadService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { ProductPayload, ProductFabric, WholesaleTier, DesignModel } from "@/lib/types/product";

import { FabricSection } from "@/components/products/FabricSection";
import { WholesaleSection } from "@/components/products/WholesaleSection";
import { CanvasDesignerSection } from "@/components/products/CanvasDesignerSection";

const searchSchema = z.object({
  search: z.string().optional().catch(""),
  category_id: z.string().optional().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(10),
});

export const Route = createFileRoute("/products/")({
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
  slug: string;
  base_price: string;
  category_id: string;
  description: string;
  gsm_info: string;
  fabric_summary: string;
  key_features: string[];
  image_urls: string[];
  image_files: File[];
  fabrics: ProductFabric[];
  wholesale: WholesaleTier[];
  design_model: DesignModel | null;
}

const emptyForm: FormState = {
  name: "", slug: "", base_price: "", category_id: "", description: "",
  gsm_info: "", fabric_summary: "", key_features: [], image_urls: [], image_files: [],
  fabrics: [], wholesale: [], design_model: null,
};

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
  const [newFeature, setNewFeature] = useState("");
  const [activeTab, setActiveTab] = useState("basic");

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
    mutationFn: (body: ProductPayload) => productsService.create(body),
    onSuccess: () => {
      toast.success("Product created");
      qc.invalidateQueries({ queryKey: ["products"] });
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductPayload }) => productsService.update(id, body),
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      closeSheet();
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
      const urls = editing.images?.map(img => img.image_url) || editing.image_urls || [];
      setForm({
        name: editing.name ?? "",
        slug: editing.slug ?? "",
        base_price: String(editing.base_price ?? ""),
        category_id: editing.category_id ?? editing.category?.id ?? "",
        description: editing.description ?? "",
        gsm_info: editing.gsm_info ?? "",
        fabric_summary: editing.fabric_summary ?? "",
        key_features: editing.key_features ?? [],
        image_urls: urls,
        image_files: [],
        fabrics: editing.fabrics ?? [],
        wholesale: editing.wholesale ?? [],
        design_model: editing.design_model ?? null,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  function openCreate() {
    setEditing(null);
    setActiveTab("basic");
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setActiveTab("basic");
    setOpen(true);
  }
  function closeSheet() {
    setOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const base_price = Number(form.base_price);
    if (!name) return toast.error("Name is required");
    if (!Number.isFinite(base_price) || base_price < 0) return toast.error("Valid base_price required");
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

    const payload: ProductPayload = {
      name,
      slug: form.slug.trim() || undefined,
      base_price,
      category_id: form.category_id,
      description: form.description.trim() || undefined,
      gsm_info: form.gsm_info.trim() || undefined,
      fabric_summary: form.fabric_summary.trim() || undefined,
      key_features: form.key_features.length > 0 ? form.key_features : undefined,
      image_urls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
      fabrics: form.fabrics.length > 0 ? form.fabrics : undefined,
      wholesale: form.wholesale.length > 0 ? form.wholesale : undefined,
      design_model: form.design_model ?? undefined,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, body: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const hasNextPage = data?.paging?.total_page ? searchParams.page < data.paging.total_page : rows.length === searchParams.limit;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Master data: products catalog and pricing.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Product
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products by name..." className="pl-8" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={searchParams.category_id || "all"} onValueChange={(val) => navigate({ search: (prev) => ({ ...prev, category_id: val === "all" ? undefined : val, page: 1 }) })}>
          <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
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
                <TableHead>Product</TableHead>
                <TableHead>Pricing & Tier</TableHead>
                <TableHead>Fabrics & Specs</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading products…</TableCell></TableRow>}
              {isError && <TableRow><TableCell colSpan={5} className="py-8 text-center text-destructive">{(error as Error)?.message ?? "Failed to load"}</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No products found.</TableCell></TableRow>}
              {rows.map((p) => {
                const firstImg = p.images?.find((img) => img.is_primary)?.image_url || p.images?.[0]?.image_url || p.image_urls?.[0];
                const minPrice = p.wholesale?.length ? Math.min(...p.wholesale.map(w => w.unit_price)) : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {firstImg ? (
                        <img src={firstImg} alt={p.name} className="h-10 w-10 rounded-md object-cover border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPreviewProduct(p)} />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link to="/products/$productId" params={{ productId: p.id }} className="font-medium hover:underline text-primary">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.category?.name ?? categories.find((c) => c.id === p.category_id)?.name ?? "—"}</div>
                      {p.design_model && <Badge variant="secondary" className="mt-1 text-[10px]">Canvas ✓</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatIDR(p.base_price)}</div>
                      {minPrice && <div className="text-xs text-muted-foreground mt-0.5">Mulai {formatIDR(minPrice)}/pcs</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.fabric_summary && <Badge variant="outline" className="w-fit text-[10px]">{p.fabric_summary}</Badge>}
                        {p.gsm_info && <span className="text-xs text-muted-foreground">{p.gsm_info}</span>}
                        {p.fabrics && p.fabrics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.fabrics.flatMap(f => f.colors ?? []).slice(0, 5).map((c, i) => (
                              <div key={i} className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.hex_code }} title={c.name} />
                            ))}
                            {(p.fabrics.flatMap(f => f.colors ?? []).length > 5) && <span className="text-[10px] text-muted-foreground">+{p.fabrics.flatMap(f => f.colors ?? []).length - 5}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link to="/products/$productId" params={{ productId: p.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Delete product "${p.name}"?`)) deleteMut.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Page {searchParams.page} of {totalPage}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={searchParams.page <= 1} onClick={() => navigate({ search: (prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }) })}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : closeSheet())}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>{editing ? "Edit Product" : "New Product"}</SheetTitle>
              <SheetDescription>{editing ? "Update product details." : "Add a new product to your catalog."}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 py-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="basic">Info Dasar</TabsTrigger>
                  <TabsTrigger value="fabrics">Fabrics & Warna</TabsTrigger>
                  <TabsTrigger value="wholesale">Grosir</TabsTrigger>
                  <TabsTrigger value="canvas">Canvas Designer</TabsTrigger>
                </TabsList>

                {/* TAB 1: BASIC INFO */}
                <TabsContent value="basic" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="prod-name">Name *</Label>
                      <Input id="prod-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} placeholder="e.g. Polo Shirt Premium" autoFocus />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prod-slug">Slug</Label>
                      <Input id="prod-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. polo-shirt-premium" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prod-category">Category *</Label>
                      <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                        <SelectTrigger id="prod-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prod-base_price">Base Price (IDR) *</Label>
                      <Input id="prod-base_price" type="number" min={0} step={1000} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prod-gsm">GSM Info</Label>
                      <Input id="prod-gsm" value={form.gsm_info} onChange={(e) => setForm({ ...form, gsm_info: e.target.value })} placeholder="e.g. 210gsm" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="prod-fabric-summary">Fabric Summary</Label>
                      <Input id="prod-fabric-summary" value={form.fabric_summary} onChange={(e) => setForm({ ...form, fabric_summary: e.target.value })} placeholder="e.g. Ripstop Cotton" />
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label>Key Features</Label>
                      <div className="flex gap-2">
                        <Input value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => {
                          if (e.key === 'Enter' && newFeature.trim()) {
                            e.preventDefault();
                            setForm({ ...form, key_features: [...form.key_features, newFeature.trim()] });
                            setNewFeature("");
                          }
                        }} placeholder="Press enter to add feature" />
                        <Button type="button" onClick={() => {
                          if (newFeature.trim()) {
                            setForm({ ...form, key_features: [...form.key_features, newFeature.trim()] });
                            setNewFeature("");
                          }
                        }}>Add</Button>
                      </div>
                      {form.key_features.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.key_features.map((feat, idx) => (
                            <Badge key={idx} variant="secondary" className="flex items-center gap-1 pr-1">
                              {feat}
                              <Button type="button" variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-muted" onClick={() => setForm({ ...form, key_features: form.key_features.filter((_, i) => i !== idx) })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label>Product Images</Label>
                      <div className="flex flex-wrap gap-4">
                        {form.image_urls.map((url, i) => (
                          <div key={`url-${i}`} className="relative h-24 w-24 overflow-hidden rounded-xl border group">
                            <img src={url} alt="Preview" className="h-full w-full object-cover bg-muted/20" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => { const newUrls = [...form.image_urls]; newUrls.splice(i, 1); setForm({ ...form, image_urls: newUrls }); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                        {form.image_files.map((file, i) => (
                          <div key={`file-${i}`} className="relative h-24 w-24 overflow-hidden rounded-xl border group">
                            <img src={URL.createObjectURL(file)} alt="Preview" className="h-full w-full object-cover bg-muted/20" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => { const newFiles = [...form.image_files]; newFiles.splice(i, 1); setForm({ ...form, image_files: newFiles }); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/20 hover:bg-muted/50">
                          <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                          <span className="text-[10px] text-muted-foreground">Upload</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) setForm({ ...form, image_files: [...form.image_files, ...files] });
                            e.target.value = "";
                          }} />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="prod-desc">Description</Label>
                      <Textarea id="prod-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: FABRICS */}
                <TabsContent value="fabrics" className="focus-visible:outline-none focus-visible:ring-0">
                  <FabricSection fabrics={form.fabrics} onChange={(fabrics) => setForm({ ...form, fabrics })} />
                </TabsContent>

                {/* TAB 3: WHOLESALE */}
                <TabsContent value="wholesale" className="focus-visible:outline-none focus-visible:ring-0">
                  <WholesaleSection tiers={form.wholesale} fabrics={form.fabrics} onChange={(wholesale) => setForm({ ...form, wholesale })} />
                </TabsContent>

                {/* TAB 4: CANVAS DESIGNER */}
                <TabsContent value="canvas" className="focus-visible:outline-none focus-visible:ring-0">
                  <CanvasDesignerSection model={form.design_model} onChange={(design_model) => setForm({ ...form, design_model })} />
                </TabsContent>
              </Tabs>
            </div>

            <SheetFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeSheet}>Cancel</Button>
              <Button type="submit" disabled={saving || uploadingImage}>{uploadingImage ? "Uploading…" : saving ? "Saving…" : editing ? "Save changes" : "Create"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!previewProduct} onOpenChange={(v) => !v && setPreviewProduct(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 bg-transparent border-none shadow-none">
          {(() => {
            if (!previewProduct) return null;
            const urls = previewProduct.images?.map((img) => img.image_url) || previewProduct.image_urls || [];
            if (urls.length === 0) return null;
            if (urls.length === 1) return <img src={urls[0]} alt={previewProduct.name} className="w-full h-auto max-h-[80vh] rounded-md object-contain bg-black/50" />;
            return (
              <Carousel className="w-full group">
                <CarouselContent>
                  {urls.map((url, i) => (
                    <CarouselItem key={i} className="flex items-center justify-center">
                      <img src={url} alt={previewProduct.name} className="w-full h-auto max-h-[80vh] rounded-md object-contain bg-black/50" />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <CarouselNext className="right-4 bg-black/50 hover:bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </Carousel>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
