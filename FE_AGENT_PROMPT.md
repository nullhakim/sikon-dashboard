# Prompt untuk AI Agent: Integrasi Fitur Material Master, Resep Produk (BOM), dan HPP Order

## Konteks

Repo ini (`sikon-dashboard`, branch `dev`) adalah dashboard ERP konveksi berbasis
**TanStack Start** (React 19 + TanStack Router file-based routing + TanStack Query +
Zustand + shadcn/ui + Tailwind v4), deploy ke Cloudflare Workers via Wrangler.

Backend (`sikon-api`, repo terpisah, Go Fiber + Clean Architecture) baru saja
ditambah 3 fitur baru yang **belum ada representasinya sama sekali di FE ini**:

1. **Material Master** — daftar bahan baku (kain, kancing, benang, dst) beserta
   harga per satuan. Ini BEDA dari fitur "Material Catalogs" (`/material-catalogs`,
   `specTemplatesService`) yang sudah ada — itu cuma spesifikasi kain untuk
   ditampilkan ke customer (komposisi, warna, cara rawat), TIDAK ada harga.
   Material Master ini murni internal, dipakai untuk hitung biaya.
2. **Resep Produk / Bill of Materials (BOM)** — tiap Product punya daftar Material
   + qty yang dibutuhkan per 1 pcs. Contoh: Kaos Polo butuh Kain Ripstop 1.2m +
   Kancing 3pcs.
3. **HPP Order** — breakdown biaya pokok produksi per Order: Material (dihitung
   dari Resep, **dibekukan/snapshot** saat Order disetujui) + Tenaga Kerja
   (dihitung live dari Work Log yang sudah ada).

Tugasmu: bangun UI untuk ketiga fitur ini di FE, konsisten dengan pola yang
SUDAH ADA di codebase — jangan bikin pola baru yang berbeda gaya.

---

## Kontrak API Backend (sudah live, base URL sesuai `VITE_API_BASE_URL`)

### 1. Material Master

```
GET    /materials?page=1&limit=10       → ApiPaginated<Material>
GET    /materials/:id                    → ApiSuccess<Material>
POST   /materials                        → ApiSuccess<Material>
PUT    /materials/:id                    → ApiSuccess<Material>
DELETE /materials/:id                    → ApiSuccess<null>
```

```ts
interface Material {
  id: string;
  name: string;
  unit: string;        // "meter" | "pcs" | "roll" | "kg" — free text, tapi tawarkan sebagai Select dengan opsi umum + custom
  unit_price: number;
  category: string;    // "kain" | "aksesoris" | "packaging" — free text juga
  created_at: string;
}
```

Request body Create/Update: `{ name, unit, unit_price, category }` (Update: semua field optional, partial update).

### 2. Resep Produk (Product Materials / BOM) — nested di bawah Product

```
GET /products/:product_id/materials      → ApiSuccess<ProductMaterial[]>
PUT /products/:product_id/materials      → ApiSuccess<ProductMaterial[]>   (REPLACE-ALL, bukan tambah satu-satu)
```

```ts
interface ProductMaterial {
  id: string;
  material_id: string;
  qty_per_unit: number;
  material?: Material;  // di-preload oleh BE, langsung ada di response GET
}
```

Request body PUT: `{ items: [{ material_id: string; qty_per_unit: number }] }`
— **PENTING**: ini replace-all. Kalau kirim array baru, resep lama otomatis
terganti seluruhnya (bukan di-merge). Jadi UI harus selalu kirim SELURUH baris
resep yang berlaku, bukan cuma baris yang berubah.

### 3. HPP Order

```
GET /orders/:id/hpp   → ApiSuccess<OrderHPPResponse>
```

```ts
interface OrderHPPResponse {
  order_id: string;
  material_cost: number;              // beku, snapshot saat Order disetujui (Quotation -> Pending)
  material_calculated_at: string | null;
  labor_cost: number;                 // LIVE, dihitung dari Work Log tiap kali endpoint ini dipanggil
  total_cost: number;                 // material_cost + labor_cost
}
```

Endpoint ini butuh role `accounting` (guard `guardFinance` di BE). Kalau dipanggil
dengan role lain akan dapat 403 (sudah ditangani otomatis oleh interceptor global
di `src/lib/api.ts` — redirect ke halaman `/forbidden`).

Order yang masih status `quotation` (belum di-approve) akan punya `material_cost: 0`
dan `material_calculated_at: null` karena belum pernah dibekukan — tampilkan state
ini secara eksplisit di UI, jangan biarkan user mengira itu Rp 0 beneran.

**Type `Order`** (`src/lib/types.ts`) perlu ditambah 2 field opsional:
```ts
hpp_material_cost?: number;
hpp_calculated_at?: string | null;
```
(Field ini sudah ikut terkirim di response `GET /orders/:id` biasa, tidak perlu
endpoint terpisah untuk baca snapshot-nya — endpoint `/hpp` di atas dipakai kalau
butuh gabungan dengan labor cost live.)

---

## Task 1 — Types

Buat file baru `src/lib/types/material.ts` isinya interface `Material` dan
`ProductMaterial` di atas. Export dari situ, import di tempat yang butuh
(ikuti pola `src/lib/types/expense.ts` — file kecil per domain, bukan ditumpuk
semua di `types.ts`).

Tambahkan 2 field baru ke `interface Order` di `src/lib/types.ts` (lihat kontrak
API bagian 3 di atas). Juga tambahkan interface `OrderHPPResponse` — taruh di
`src/lib/types/material.ts` juga tidak apa (dekat dengan `ProductMaterial` yang
dipakainya) atau di `types.ts` dekat `Order`, pilih salah satu yang lebih rapi.

---

## Task 2 — Services (`src/lib/services.ts`)

Tambahkan 3 service object baru, **PERSIS meniru pola `expensesService` dan
`specTemplatesService`** yang sudah ada di file yang sama (generic `api.get/post/put/delete`,
`ApiPaginated`/`ApiSuccess` wrapper, `PageParams` untuk pagination):

```ts
export const materialsService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Material>>("/materials", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<Material>>(`/materials/${id}`),
  create: (body: { name: string; unit: string; unit_price: number; category?: string }) =>
    api.post<ApiSuccess<Material>>("/materials", body),
  update: (id: string, body: Partial<{ name: string; unit: string; unit_price: number; category: string }>) =>
    api.put<ApiSuccess<Material>>(`/materials/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/materials/${id}`),
};

export const productMaterialsService = {
  getForProduct: (productId: string) =>
    api.get<ApiSuccess<ProductMaterial[]>>(`/products/${productId}/materials`),
  setForProduct: (productId: string, items: { material_id: string; qty_per_unit: number }[]) =>
    api.put<ApiSuccess<ProductMaterial[]>>(`/products/${productId}/materials`, { items }),
};
```

Tambahkan 1 method baru ke `ordersService` yang sudah ada (jangan bikin service
baru terpisah, karena ini konseptual masih bagian dari Order):

```ts
getHpp: (id: string) => api.get<ApiSuccess<OrderHPPResponse>>(`/orders/${id}/hpp`),
```

Jangan lupa import type `Material`, `ProductMaterial`, `OrderHPPResponse` dari
`./types/material` di bagian import atas file.

---

## Task 3 — Halaman baru: Material Master (`/materials`)

Buat `src/routes/materials.tsx`. **Contoh yang harus kamu tiru strukturnya
adalah `src/routes/material-catalogs.tsx`** (baca file itu dulu sebelum mulai) —
pola: `useQuery` untuk list + pagination manual (state `page`), `useMutation`
untuk create/update/delete dengan `onSuccess` invalidate query + toast `sonner`,
`Dialog` shadcn untuk form create/edit, tabel shadcn dengan tombol edit/delete
per baris.

Kolom tabel: Name, Unit, Category (badge), Unit Price (format Rupiah — pakai
helper `formatIDR` dari `src/lib/format.ts`, JANGAN reinvent format currency),
Created, Actions.

Form create/edit: Name (Input), Unit (Select dengan opsi umum: meter, pcs, roll,
kg, lusin — plus opsi ketik manual kalau perlu), Unit Price (**pakai komponen
`CurrencyInput` yang sudah ada di `src/components/CurrencyInput.tsx`**, jangan
bikin currency input baru), Category (Select: kain, aksesoris, packaging, lainnya).

Daftarkan route ini ke sidebar: buka `src/components/AppSidebar.tsx`, cari baris
`nav.material_catalogs` (sekitar baris 93), tambahkan item baru **di bawahnya**,
di grup "Master Data" yang sama:

```ts
{ titleKey: "nav.materials", defaultTitle: "Master Bahan (HPP)", url: "/materials", icon: Package, roles: ["owner", "accounting"] },
```

(Sesuaikan nama icon import dari `lucide-react` kalau `Package` sudah dipakai
untuk hal lain — cek import di atas file itu dulu. Role dibatasi `owner` +
`accounting` karena ini data harga bahan yang sensitif, jangan sampai Sales
lihat markup/margin dari sini.)

Kalau proyek ini pakai i18n (`src/lib/i18n.ts`) dengan key seperti
`nav.material_catalogs`, tambahkan juga entry terjemahan `nav.materials` di
kedua bahasa yang didukung — cek isi `i18n.ts` untuk format persisnya.

---

## Task 4 — Resep Produk (BOM) di halaman detail Product

**Ini BUKAN pola yang sama dengan `FabricSection.tsx`** meskipun secara konsep
mirip (keduanya "daftar item terkait Product"). Bedanya penting:
`ProductFabric` disimpan sebagai bagian dari payload create/update Product itu
sendiri (array di dalam form utama). **Resep Material itu resource terpisah**
dengan endpoint sendiri (`PUT /products/:id/materials`) yang dipanggil independen
dari form edit Product utama. Jangan coba gabungkan ke payload `productsService.update()`.

Buka `src/routes/products.$productId.tsx` (halaman detail, read-only + tombol
aksi). Tambahkan Card baru di halaman ini, judul "Resep Produk (BOM)", isinya:

- **Mode tampil**: tabel resep yang sudah tersimpan — Material name, Unit,
  Qty per unit, Subtotal (`qty_per_unit * material.unit_price`), dan baris total
  "Estimasi HPP Material per pcs" di bawah.
- **Tombol "Kelola Resep"** buka `Dialog` berisi form editable:
  - List baris: `Select` Material (dari `materialsService.list({ limit: 100 })`,
    tampilkan `name (unit) - Rp{unit_price}`) + `Input` number untuk qty_per_unit
    + tombol hapus baris. Tombol "+ Tambah Bahan" nambah baris kosong.
  - Live preview: total estimasi biaya material per pcs, dihitung ulang setiap
    kali user ubah qty/pilih material — beri feedback instan, jangan tunggu save.
  - Tombol "Simpan Resep" — panggil `productMaterialsService.setForProduct(productId, items)`
    lewat `useMutation`, validasi dulu (semua baris harus punya `material_id`
    terisi dan `qty_per_unit > 0` sebelum submit, tolak submit kalau ada baris
    kosong dengan toast error). `onSuccess`: invalidate query `["product-materials", productId]`, toast sukses, tutup dialog.

Buat query untuk load resep yang sudah ada:
```ts
useQuery({
  queryKey: ["product-materials", productId],
  queryFn: () => productMaterialsService.getForProduct(productId),
});
```

Pertimbangkan ekstrak jadi komponen terpisah `src/components/products/ProductMaterialsSection.tsx`
kalau halaman detail Product sudah panjang (cek dulu berapa baris `products.$productId.tsx`
sekarang — kalau sudah ratusan baris, jangan tambah blok besar inline, pecah jadi
komponen sendiri, ikuti convention taruh di folder `src/components/products/`).

---

## Task 5 — Tampilkan HPP di halaman detail Order

Buka `src/routes/orders.$orderId.tsx` (file besar, baca dulu struktur section
yang sudah ada sebelum nambah — biasanya berupa beberapa `Card` bertumpuk).
Tambahkan Card baru "Rincian HPP", **tampil hanya kalau order sudah pernah
di-approve** (`order.approved_at` tidak null) dan **hanya untuk role owner/accounting**
(cek pola pengecekan role yang sudah dipakai di file ini untuk section sensitif
lain, misal di bagian Payment — replikasi pola yang sama, jangan bikin baru).

```ts
const { data: hppRes, isLoading: hppLoading } = useQuery({
  queryKey: ["order-hpp", orderId],
  queryFn: () => ordersService.getHpp(orderId),
  enabled: !!order?.approved_at, // jangan fetch kalau order belum di-approve
});
```

Isi card:
- Kalau `!order.approved_at`: tampilkan pesan "HPP akan dihitung otomatis setelah
  Order disetujui (status Pending)", bukan Card kosong atau loading forever.
- Kalau ada data: tampilkan 3 baris — **Material** (dengan label kecil "dibekukan
  saat {formatDate(hpp.material_calculated_at)}"), **Tenaga Kerja** (label kecil
  "live, update otomatis"), dan **Total HPP** (bold, garis pemisah di atasnya).
  Semua format pakai `formatIDR`.
- Opsional tapi bagus: kalau `order.total_amount` ada, tampilkan juga estimasi
  margin (`total_amount - total_cost`) sebagai info tambahan kecil di bawah,
  supaya user langsung lihat untung-rugi order ini tanpa hitung manual.

---

## Batasan & hal yang WAJIB dicek sebelum dianggap selesai

1. **Jangan ubah `FabricSection.tsx` atau alur create/update Product yang sudah
   ada** — Resep Material itu independen, endpoint terpisah, jangan disatukan.
2. **Jangan bikin currency/number formatter baru** — pakai `formatIDR` dari
   `src/lib/format.ts` untuk semua nominal Rupiah, dan `CurrencyInput.tsx` untuk
   semua input nominal.
3. **Konsisten pakai `sonner` untuk toast**, `useMutation` + `invalidateQueries`
   untuk semua operasi tulis — jangan `window.location.reload()` atau state
   manual untuk refresh data.
4. Jalankan `npm run lint` (atau `bun run lint`, cek `package.json`) dan
   `tsc --noEmit` (lewat build) di akhir, pastikan tidak ada type error baru.
5. **Role visibility**: pastikan halaman `/materials` dan Card HPP di Order
   detail betul-betul tersembunyi/dibatasi dari role Sales, karena ini data
   biaya internal — cek ulang array `roles` di `AppSidebar.tsx` dan pola guard
   role yang sudah dipakai di route/komponen sensitif lain di repo ini.
6. Test manual minimal: buat Material baru → set Resep di sebuah Product →
   approve sebuah Order yang pakai produk itu → buka detail Order, pastikan
   Card HPP muncul dengan angka yang masuk akal (qty order × harga resep).

## Kalau ada yang ambigu

Backend-nya baru selesai dibangun bareng saya (developer) — endpoint di atas
sudah pasti ada dan sudah ditest (unit + integration test lolos di sisi BE).
Kalau ada respons API yang tidak sesuai dokumentasi ini pas kamu coba di
lapangan, laporkan balik ke saya persis error/response-nya, jangan diam-diam
di-workaround dengan asumsi sendiri.
