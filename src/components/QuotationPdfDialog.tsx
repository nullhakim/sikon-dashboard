import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Order, OrderItem, Customer } from "@/lib/types";

const fmtIDR = (n: number) =>
  "Rp " + Math.round(n || 0).toLocaleString("id-ID");

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
}

export function QuotationPdfDialog({ open, onClose, order, items, customer }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = order.shipping_cost || 0;
  const total = order.total_amount || subtotal + shipping;

  async function handleDownload() {
    if (!sheetRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: sheetRef.current.scrollWidth,
        windowHeight: sheetRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      } else {
        // Slice across multiple pages
        let position = 0;
        let heightLeft = imgHeight;
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const fileName = `Surat_Penawaran_${order.order_number || order.id.slice(0, 8)}.pdf`;
      pdf.save(fileName);
      toast.success("Quotation downloaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Preview Surat Penawaran</span>
            <Button onClick={handleDownload} disabled={generating} size="sm">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* A4 sheet — 210mm x 297mm at 96dpi ≈ 794 x 1123 px */}
        <div className="flex justify-center bg-muted/40 p-4 rounded-md">
          <div
            ref={sheetRef}
            className="bg-white text-black shadow-md"
            style={{
              width: "794px",
              minHeight: "1123px",
              padding: "60px 64px",
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: "12pt",
              lineHeight: 1.5,
              color: "#000",
            }}
          >
            {/* 1. Letterhead */}
            <div className="text-center pb-3 border-b-4 border-black">
              <h1 className="text-2xl font-bold tracking-wide uppercase m-0">
                CV. WIJAYA FAMILY TASIKMALAYA
              </h1>
              <p className="m-0 mt-1 text-sm">
                Kp. Kebon Kalapa, Desa Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya (0265-7543224)
              </p>
              <p className="m-0 text-sm">AHU-0024761-AH.01.16 Tahun 2024</p>
            </div>

            {/* 2. Document Title */}
            <div className="text-center my-6">
              <h2 className="inline-block text-lg font-bold underline uppercase m-0">
                Surat Penawaran
              </h2>
            </div>

            {/* 3. Meta + Recipient */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td className="pr-3 align-top">Nomor</td>
                      <td className="pr-2 align-top">:</td>
                      <td className="align-top">
                        SP-{order.order_number || order.id.slice(0, 8)}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-3 align-top">Lampiran</td>
                      <td className="pr-2 align-top">:</td>
                      <td className="align-top">-</td>
                    </tr>
                    <tr>
                      <td className="pr-3 align-top">Perihal</td>
                      <td className="pr-2 align-top">:</td>
                      <td className="align-top">Penawaran Seragam</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <p className="m-0">Kepada Yth.</p>
                <p className="m-0 font-semibold">{customer?.name || "—"}</p>
                {customer?.address && <p className="m-0">{customer.address}</p>}
              </div>
            </div>

            {/* 4. Opening Paragraph */}
            <div className="mb-4 text-sm">
              <p className="m-0 mb-2">Dengan hormat,</p>
              <p className="m-0 text-justify" style={{ textIndent: "2em" }}>
                Menindaklanjuti pemesanan seragam yang dikirimkan, maka kami CV WIJAYA FAMILY
                TASIKMALAYA sebagai perusahaan yang bergerak di bidang produksi seragam,
                bermaksud mengajukan penawaran. Spesifikasi yang kami tawarkan sebagai berikut:
              </p>
            </div>

            {/* 5. Item Specifications */}
            <div className="mb-5 text-sm">
              {items.map((it, idx) => {
                const name = it.product_name || it.product?.name || "—";
                const lines = buildQuotationSpecLines(
                  (it.details || {}) as Record<string, unknown>,
                );
                return (
                  <div key={it.id ?? idx} className="mb-3">
                    <p className="m-0 font-semibold">
                      {idx + 1}. {name}
                    </p>
                    {lines.length > 0 && (
                      <ul className="list-disc m-0 mt-1 pl-10">
                        {lines.map((ln, i) => (
                          <li key={i} className="m-0">
                            <span className="font-medium">{ln.label}:</span>{" "}
                            {ln.value}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 6. Pricing Table */}
            <table
              className="w-full text-sm mb-6"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th style={cellHead}>No</th>
                  <th style={{ ...cellHead, textAlign: "left" }}>Nama Barang</th>
                  <th style={cellHead}>Qty</th>
                  <th style={{ ...cellHead, textAlign: "right" }}>Harga Satuan</th>
                  <th style={{ ...cellHead, textAlign: "right" }}>Total Harga</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id ?? idx}>
                    <td style={{ ...cell, textAlign: "center" }}>{idx + 1}</td>
                    <td style={cell}>{it.product_name || it.product?.name || "—"}</td>
                    <td style={{ ...cell, textAlign: "center" }}>{it.qty}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{fmtIDR(it.price)}</td>
                    <td style={{ ...cell, textAlign: "right" }}>
                      {fmtIDR(it.qty * it.price)}
                    </td>
                  </tr>
                ))}
                {shipping > 0 && (
                  <tr>
                    <td style={{ ...cell, textAlign: "right" }} colSpan={4}>
                      Pengiriman
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>{fmtIDR(shipping)}</td>
                  </tr>
                )}
                <tr>
                  <td
                    style={{ ...cell, textAlign: "right", fontWeight: 700 }}
                    colSpan={4}
                  >
                    Total Keseluruhan
                  </td>
                  <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>
                    {fmtIDR(total)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 7. Terms */}
            {(order.terms_conditions || order.valid_until) && (
              <div className="mb-6 text-sm">
                {order.terms_conditions && (
                  <p className="m-0 whitespace-pre-wrap">{order.terms_conditions}</p>
                )}
                {order.valid_until && (
                  <p className="m-0 mt-2 font-medium">
                    Penawaran ini berlaku hingga: {fmtDate(order.valid_until)}
                  </p>
                )}
              </div>
            )}

            {/* 8. Closing & Signature */}
            <div className="flex justify-end mt-12 text-sm">
              <div className="text-left">
                <p className="m-0">Hormat kami,</p>
                <div style={{ height: "90px" }} />
                <p className="m-0 font-semibold underline">
                  {order.sales?.name || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const cellHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 8px",
  fontWeight: 700,
  textAlign: "center",
  background: "#f3f4f6",
};

const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 8px",
  verticalAlign: "top",
};

const BORDIR_SUFFIX =
  ", Sehingga Hasil Cetakan Lebih Rapi, Juga Memiliki Tekstur Timbul.";
const BENANG_SUFFIX =
  ", Sehingga Warna Bordir Lebih Cerah Dan Warna Lebih Awet.";

function expandWithSuffix(value: string, marker: string, suffix: string) {
  const v = (value || "").trim();
  if (!v) return "";
  if (v.includes(marker)) return v;
  return v.replace(/[.\s]+$/, "") + suffix;
}

function buildQuotationSpecLines(
  details: Record<string, unknown>,
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  const bahan = details.Bahan ?? details.bahan;
  if (bahan && typeof bahan === "object") {
    const b = bahan as Record<string, unknown>;
    const parts: string[] = [];
    const bName = b.Name ?? b.name;
    const bColor = b.Color ?? b.color;
    if (bName) parts.push(String(bName));
    if (bColor) parts.push(String(bColor));
    const head = parts.join(" — ");
    const bSpec = b.Spec ?? b.spec;
    const spec = bSpec ? String(bSpec) : "";
    const value = [head, spec].filter(Boolean).join(". ");
    if (value) lines.push({ label: "Bahan", value });
  } else if (typeof bahan === "string" && bahan.trim()) {
    lines.push({ label: "Bahan", value: bahan });
  }

  const bordir = details.Bordir ?? details.bordir;
  if (bordir) {
    lines.push({
      label: "Bordir",
      value: expandWithSuffix(String(bordir), "Sehingga Hasil Cetakan", BORDIR_SUFFIX),
    });
  }
  const benang = details.Benang ?? details.benang;
  if (benang) {
    lines.push({
      label: "Benang",
      value: expandWithSuffix(String(benang), "Sehingga Warna Bordir", BENANG_SUFFIX),
    });
  }
  const jahitan = details.Jahitan ?? details.jahitan;
  if (jahitan) {
    lines.push({ label: "Jahitan", value: String(jahitan) });
  }
  return lines;
}
