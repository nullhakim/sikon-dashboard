import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, Image as ImageIcon, Box, Ruler, Info, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsService } from "@/lib/services";
import { formatIDR } from "@/lib/format";
import { ProductMaterialsSection } from "@/components/products/ProductMaterialsSection";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const router = useRouter();

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsService.get(productId),
  });

  const product = res?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">The product you're looking for does not exist or has been deleted.</p>
        <Button onClick={() => router.history.back()}>Go Back</Button>
      </div>
    );
  }

  const allImages = product.images?.map(i => i.image_url) || product.image_urls || [];
  const minWholesale = product.wholesale?.length ? Math.min(...product.wholesale.map(w => w.unit_price)) : null;

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/products" className="hover:text-foreground transition-colors flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Products
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px]">{product.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {product.category && <Badge variant="secondary">{product.category.name}</Badge>}
            <Badge variant="outline" className="font-mono text-muted-foreground">{product.slug || product.id.split("-")[0]}</Badge>
            {product.design_model && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">Canvas Designer ✓</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.alert("Untuk edit, gunakan form di halaman utama Products.")}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COL: IMAGES */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="overflow-hidden border-none shadow-sm bg-muted/10">
            {allImages.length > 0 ? (
              allImages.length === 1 ? (
                <img src={allImages[0]} alt={product.name} className="w-full aspect-square object-contain bg-white rounded-xl border" />
              ) : (
                <Carousel className="w-full relative group">
                  <CarouselContent>
                    {allImages.map((url, i) => (
                      <CarouselItem key={i}>
                        <img src={url} alt={`${product.name} - ${i+1}`} className="w-full aspect-square object-contain bg-white rounded-xl border" />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="absolute left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CarouselNext className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Carousel>
              )
            ) : (
              <div className="w-full aspect-square bg-muted/30 flex flex-col items-center justify-center rounded-xl border border-dashed">
                <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <span className="text-sm text-muted-foreground">No images available</span>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Base Price</span>
                <span className="text-xl font-bold">{formatIDR(product.base_price)}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Wholesale (Mulai)</span>
                <span className="text-xl font-bold">{minWholesale ? formatIDR(minWholesale) : "—"}</span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COL: INFO & TABS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Info Box */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Info className="h-5 w-5 mr-2 text-muted-foreground" />
                Product Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Fabric Summary</span>
                  <p className="font-medium">{product.fabric_summary || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Grammage (GSM)</span>
                  <p className="font-medium">{product.gsm_info || "—"}</p>
                </div>
              </div>

              {product.key_features && product.key_features.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Key Features</span>
                  <div className="flex flex-wrap gap-2">
                    {product.key_features.map((f, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.description && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Description</span>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fabrics & Colors */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center">
                <Box className="h-4 w-4 mr-2 text-muted-foreground" />
                Fabrics & Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {(!product.fabrics || product.fabrics.length === 0) ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada varian kain khusus.
                </div>
              ) : (
                <div className="divide-y">
                  {product.fabrics.map((f, i) => (
                    <div key={i} className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{f.name} {f.is_default && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">Default</Badge>}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.composition || "Komposisi tidak diset"}</p>
                        </div>
                        {f.price_adjustment ? (
                          <Badge variant="secondary">+{formatIDR(f.price_adjustment)}</Badge>
                        ) : null}
                      </div>
                      
                      {f.description && <p className="text-sm">{f.description}</p>}
                      
                      {f.colors && f.colors.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-medium text-muted-foreground">PILIHAN WARNA:</span>
                          <div className="flex flex-wrap gap-3">
                            {f.colors.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 rounded-full border bg-muted/20 px-2.5 py-1 text-xs">
                                <span className="h-3.5 w-3.5 rounded-full border shadow-sm" style={{ backgroundColor: c.hex_code }} />
                                <span>{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wholesale Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Grosir / Wholesale Pricing</CardTitle>
              <CardDescription>Harga bertingkat berdasarkan kuantitas pesanan.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(!product.wholesale || product.wholesale.length === 0) ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Tidak ada harga grosir untuk produk ini.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Tier Qty</TableHead>
                      <TableHead>Spesifik Kain</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.wholesale.sort((a,b) => a.min_qty - b.min_qty).map((w, i) => {
                      const fabricName = w.fabric_id ? product.fabrics?.find(f => f.id === w.fabric_id)?.name || "Kain Tertentu" : "Semua Kain";
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {w.min_qty} {w.max_qty ? `- ${w.max_qty}` : "+"} pcs
                          </TableCell>
                          <TableCell className="text-muted-foreground">{fabricName}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatIDR(w.unit_price)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Resep Produk (BOM) */}
          <ProductMaterialsSection productId={productId} />

          {/* Canvas Designer */}
          {product.design_model && (
            <Card className="border-indigo-100 shadow-sm overflow-hidden">
              <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-indigo-900 flex items-center">
                    <Ruler className="h-4 w-4 mr-2 text-indigo-600" />
                    Canvas Designer Template
                  </h3>
                  <p className="text-xs text-indigo-700/70 mt-0.5">{product.design_model.name} — {product.design_model.type}</p>
                </div>
              </div>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {product.design_model.views?.map((view, i) => (
                  <div key={i} className="space-y-3">
                    <Badge variant="outline" className="bg-white">{view.side === "front" ? "Tampak Depan" : "Tampak Belakang"}</Badge>
                    <div className="relative rounded-xl border bg-grid-slate-100 overflow-hidden" style={{ aspectRatio: (view.width || 1756)/(view.height || 1920) }}>
                       <img src={view.mask_url} alt="Mask" className="absolute inset-0 w-full h-full object-contain opacity-50 mix-blend-multiply" />
                       <img src={view.art_url} alt="Lineart" className="absolute inset-0 w-full h-full object-contain drop-shadow-sm" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
