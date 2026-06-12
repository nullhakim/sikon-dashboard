/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem, Customer, Payment, BankAccount } from "./types";

export interface InvoiceOptions {
  withStamp?: boolean;
  withSignature?: boolean;
  note?: string;
}

interface InvoiceData {
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
  payments?: Payment[];
  bankAccounts?: BankAccount[];
  options?: InvoiceOptions;
}

const COMPANY = {
  name: "WIFT INDONESIA",
  tagline: "Solusi Seragam Kantor Terpercaya",
  address:
    "Jl. Mangunreja Singaparna Kp. Kebon Kalapa, Kel.Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya",
  phone: "0265-7543224",
  instagram: "wiftindonesia_official",
  email: "wijayafamily.wft@gmail.com",
  website: "wiftindonesia.com",
};

const formatBankLine = (b: BankAccount) =>
  `${b.bank_name}: ${b.account_number} a/n ${b.account_name}`;

const formatCurrency = (value: number) => "Rp " + Math.round(value || 0).toLocaleString("id-ID");

function terbilang(n: number): string {
  if (n < 0) return "Minus " + terbilang(-n);
  n = Math.round(n);
  if (n === 0) return "Nol";

  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  const convert = (val: number): string => {
    if (val < 12) return satuan[val];
    if (val < 20) return satuan[val - 10] + " Belas";
    if (val < 100)
      return satuan[Math.floor(val / 10)] + " Puluh" + (val % 10 ? " " + convert(val % 10) : "");
    if (val < 200) return "Seratus" + (val % 100 ? " " + convert(val % 100) : "");
    if (val < 1000)
      return satuan[Math.floor(val / 100)] + " Ratus" + (val % 100 ? " " + convert(val % 100) : "");
    if (val < 2000) return "Seribu" + (val % 1000 ? " " + convert(val % 1000) : "");
    if (val < 1_000_000)
      return (
        convert(Math.floor(val / 1000)) + " Ribu" + (val % 1000 ? " " + convert(val % 1000) : "")
      );
    if (val < 1_000_000_000)
      return (
        convert(Math.floor(val / 1_000_000)) +
        " Juta" +
        (val % 1_000_000 ? " " + convert(val % 1_000_000) : "")
      );
    if (val < 1_000_000_000_000)
      return (
        convert(Math.floor(val / 1_000_000_000)) +
        " Miliar" +
        (val % 1_000_000_000 ? " " + convert(val % 1_000_000_000) : "")
      );
    return (
      convert(Math.floor(val / 1_000_000_000_000)) +
      " Triliun" +
      (val % 1_000_000_000_000 ? " " + convert(val % 1_000_000_000_000) : "")
    );
  };

  return convert(n) + " Rupiah";
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Invoice (order) renders only the basic Bahan info — skips quotation-only
// fields like Bordir / Benang / Jahitan and Bahan.Spec.
function formatOrderDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, any>;
  const parts: string[] = [];
  const bahan = d.Bahan;
  if (bahan && typeof bahan === "object") {
    const b = bahan as Record<string, any>;
    const inner: string[] = [];
    if (b.Name) inner.push(String(b.Name));
    if (b.Color) inner.push(String(b.Color));
    if (inner.length) parts.push(`Bahan: ${inner.join(" - ")}`);
  } else if (typeof bahan === "string" && bahan.trim()) {
    parts.push(`Bahan: ${bahan}`);
  }
  if (d.Warna) parts.push(`Warna: ${d.Warna}`);
  return parts.join(", ");
}

async function loadImageDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoicePDF({
  order,
  items,
  customer,
  payments = [],
  bankAccounts = [],
  options,
}: InvoiceData): Promise<jsPDF> {
  const { withStamp = false, withSignature = false } = options || {};

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === 1. HEADER ===
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 50, "F");

  const logoData = await loadImageDataURL("/assets/logo.png");
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin - 5, 12, 25, 25);
    } catch {
      // ignore
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, margin + 25, 24);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin + 25, 32);

  doc.setFontSize(8);
  const headerRightX = pageWidth - margin;
  doc.text(COMPANY.address, headerRightX, 18, { align: "right", maxWidth: 70 });
  doc.text(`Tel: ${COMPANY.phone} | ${COMPANY.email}`, headerRightX, 28, { align: "right" });
  doc.text(`${COMPANY.website} | IG: ${COMPANY.instagram}`, headerRightX, 33, { align: "right" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, 46, { align: "right" });

  doc.setTextColor(30, 41, 59);

  // === 2. INVOICE INFO ===
  let y = 65;
  const col1 = margin;
  const col2 = pageWidth / 2 + 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Ditagihkan kepada:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(customer?.name || "-", col1, y + 7);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  // if (customer?.address) doc.text(customer.address, col1, y + 14, { maxWidth: 80 });
  // if (customer?.phone) doc.text(`Tel: ${customer.phone}`, col1, y + 22);
  doc.text("Address: ", col1, y + 14, { maxWidth: 80 });
  doc.text("Phone: ", col1, y + 22);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const invNumber = order.order_number
    ? `INV-${order.order_number}`
    : `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const infoLabels = ["No. Invoice", "Tanggal"];
  // const infoLabels = ["No. Invoice", "Tanggal", "Status Order", "Status Bayar"];
  const infoValues = [
    invNumber,
    formatDate(order.created_at),
    (order.order_status || "pending").toUpperCase(),
    (order.payment_status || "unpaid").toUpperCase(),
  ];

  infoLabels.forEach((label, i) => {
    const ly = y + i * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, col2, ly);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${infoValues[i]}`, col2 + 35, ly);
  });

  // === 3. ITEMS TABLE ===
  y = y + 38;

  const tableBody = items.map((item, idx) => {
    const subtotal = item.subtotal ?? item.qty * item.price;
    const detailStr = formatOrderDetails(item.details);
    return [
      String(idx + 1),
      (item.product_name || item.product?.name || "-") + (detailStr ? "\n" + detailStr : ""),
      String(item.qty),
      formatCurrency(item.price),
      formatCurrency(subtotal),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["No", "Produk", "Qty", "Harga/Unit", "Subtotal"]],
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 40, halign: "right" },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // === 4. TOTALS ===
  const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
  const totalsX = pageWidth - margin - 80;

  const subtotal = items.reduce((s, i) => s + (i.subtotal ?? i.qty * i.price), 0);
  const shippingCost = order.shipping_cost || 0;
  const amountPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalAmount = order.total_amount ?? subtotal + shippingCost;

  let ty = finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, ty);
  doc.text(formatCurrency(subtotal), pageWidth - margin, ty, { align: "right" });

  if (shippingCost > 0) {
    ty += 8;
    const shippingLabel = order.courier_name ? `Ongkir (${order.courier_name})` : "Ongkir";
    doc.text(shippingLabel, totalsX, ty);
    doc.text(formatCurrency(shippingCost), pageWidth - margin, ty, { align: "right" });
  }

  ty += 8;
  doc.text("Total", totalsX, ty);
  doc.text(formatCurrency(totalAmount), pageWidth - margin, ty, { align: "right" });

  ty += 8;
  doc.text("Sudah Dibayar", totalsX, ty);
  doc.text(formatCurrency(amountPaid), pageWidth - margin, ty, { align: "right" });

  ty += 4;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty, pageWidth - margin, ty);

  ty += 8;
  const sisa = Math.max(0, totalAmount - amountPaid);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Sisa Tagihan", totalsX, ty);
  doc.text(formatCurrency(sisa), pageWidth - margin, ty, { align: "right" });

  // Terbilang (amount in words) — only when there's a remaining balance
  if (sisa > 0) {
    ty += 8;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const terbilangText = `Terbilang: ${terbilang(sisa)}`;
    const terbilangLines = doc.splitTextToSize(terbilangText, 80);
    doc.text(terbilangLines, totalsX, ty);
    doc.setTextColor(30, 41, 59);
  }

  // Payment status badge
  // ty += 12;
  // const payStatus = (order.payment_status || "unpaid").toLowerCase();
  // const badgeColors: Record<string, [number, number, number]> = {
  //   paid: [34, 197, 94],
  //   partial: [234, 179, 8],
  //   unpaid: [239, 68, 68],
  // };
  // const badgeColor = badgeColors[payStatus] || badgeColors.unpaid;
  // doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  // const statusText = payStatus.toUpperCase();
  // const statusWidth = doc.getTextWidth(statusText) + 12;
  // doc.roundedRect(pageWidth - margin - statusWidth, ty - 5, statusWidth, 8, 2, 2, "F");
  // doc.setTextColor(255, 255, 255);
  // doc.setFontSize(8);
  // doc.setFont("helvetica", "bold");
  // doc.text(statusText, pageWidth - margin - statusWidth / 2, ty, { align: "center" });

  // === 5. BANK INFO ===
  const bankY = finalY + 10;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Pembayaran:", margin, bankY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bankLines = bankAccounts.length
    ? bankAccounts.map(formatBankLine)
    : ["(Belum ada rekening sales yang terdaftar)"];
  bankLines.forEach((line, i) => {
    doc.text(line, margin, bankY + 6 + i * 5);
  });

  if (options?.note) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68);
    const noteLines = doc.splitTextToSize(options.note, pageWidth - margin * 2);
    doc.text(noteLines, margin, bankY + 6 + bankLines.length * 5 + 2);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
  }

  // === 6. SIGNATURE ===
  const sigY = ty + 20;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hormat Kami,", pageWidth - margin, sigY, { align: "right" });
  doc.text("Manager WIFT Indonesia", pageWidth - margin, sigY + 5, { align: "right" });

  // Stempel (stamp) — left of signature name
  if (withStamp) {
    const stempelData = await loadImageDataURL("/assets/stempel-wift.png");
    if (stempelData) {
      try {
        const size = 35;
        doc.addImage(stempelData, "PNG", pageWidth - margin - 70, sigY + 5, size, size);
      } catch {
        // ignore
      }
    }
  }

  // Signature image — above the name
  if (withSignature) {
    const sigData = await loadImageDataURL("/assets/ttd-manager.png");
    if (sigData) {
      try {
        const w = 35;
        const h = 25;
        doc.addImage(sigData, "PNG", pageWidth - margin - 25 - w / 2, sigY + 7, w, h);
      } catch {
        // ignore
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.text("( Yusri Siti Aisyah., S.Ak )", pageWidth - margin - 25, sigY + 35, {
    align: "center",
  });

  // === 7. WATERMARK LUNAS ===
  if (sisa <= 0) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.setFontSize(120);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("LUNAS", pageWidth / 2, pageHeight / 2, {
      align: "center",
    });
    doc.restoreGraphicsState();
  }

  // === 8. FOOTER ===
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const footerY = pageHeight - 20;
  doc.text("Terima kasih atas kepercayaan Anda.", pageWidth / 2, footerY, { align: "center" });
  doc.text(`${COMPANY.name} — ${COMPANY.address}`, pageWidth / 2, footerY + 5, {
    align: "center",
    maxWidth: pageWidth - margin * 2,
  });

  return doc;
}

export async function generateKwitansiPDF({
  payment,
  order,
  customer,
  options,
}: {
  payment: Payment;
  order: Order;
  customer: Customer | null;
  options?: InvoiceOptions;
}): Promise<jsPDF> {
  const { withStamp = false, withSignature = false } = options || {};

  const doc = new jsPDF("landscape", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header background
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 50, "F");

  const logoData = await loadImageDataURL("/assets/logo.png");
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, 12, 25, 25);
    } catch {
      // ignore
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, margin + 30, 24);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.tagline, margin + 30, 32);

  doc.setFontSize(8);
  const headerRightX = pageWidth - margin;
  doc.text(COMPANY.address, headerRightX, 18, { align: "right", maxWidth: 100 });
  doc.text(`Tel: ${COMPANY.phone} | ${COMPANY.email}`, headerRightX, 28, { align: "right" });
  doc.text(`${COMPANY.website} | IG: ${COMPANY.instagram}`, headerRightX, 33, { align: "right" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("KWITANSI", pageWidth - margin, 46, { align: "right" });

  doc.setTextColor(30, 41, 59);

  let y = 75;

  // Kwitansi No
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("No.", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${payment.reference_number || payment.id.slice(0, 8).toUpperCase()}`, margin + 40, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Sudah Terima Dari", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${customer?.name || "-"}`, margin + 40, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Banyaknya Uang", margin, y);

  // Background for terbilang
  doc.setFillColor(245, 247, 250);
  doc.rect(margin + 40, y - 6, pageWidth - margin * 2 - 40, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const terbilangText = terbilang(payment.amount);
  doc.text(`: ${terbilangText}`, margin + 42, y + 2);

  y += 20;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Untuk Pembayaran", margin, y);
  doc.setFont("helvetica", "normal");
  const invNumber = order.order_number
    ? `INV-${order.order_number}`
    : `INV-${order.id.slice(0, 8).toUpperCase()}`;

  const paymentTypeName = payment.payment_type.toUpperCase();
  const notes =
    payment.payment_type === "dp"
      ? `Down Payment (DP)`
      : payment.payment_type === "settlement"
        ? `Pelunasan`
        : payment.payment_type === "installment"
          ? `Cicilan`
          : paymentTypeName;

  const paymentDesc = `: Pembayaran ${notes} untuk Tagihan ${invNumber}`;
  doc.text(paymentDesc, margin + 40, y);
  if (order.items && order.items.length > 0) {
    const productMap = new Map<string, { name: string; qty: number }>();
    order.items.forEach((item) => {
      const pName = item.product_name || item.product?.name || "Produk";
      const pId = item.product_id || pName;
      if (productMap.has(pId)) {
        productMap.get(pId)!.qty += item.qty;
      } else {
        productMap.set(pId, { name: pName, qty: item.qty });
      }
    });

    const summaryParts = Array.from(productMap.values()).map((p) => `${p.qty} ${p.name}`);
    let summaryStr = "";
    if (summaryParts.length > 1) {
      const last = summaryParts.pop();
      summaryStr = summaryParts.join(", ") + " dan " + last;
    } else if (summaryParts.length === 1) {
      summaryStr = summaryParts[0];
    }

    if (summaryStr) {
      doc.text(`  (Pemesanan ${summaryStr})`, margin + 40, y + 6);
    }
  }

  y += 40;

  // Total Box
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, 70, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(formatCurrency(payment.amount), margin + 35, y + 10, { align: "center" });

  // Signature
  doc.setTextColor(30, 41, 59);
  const sigX = pageWidth - margin - 50;
  const sigY = y - 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Tasikmalaya, ${formatDate(payment.payment_date || payment.created_at)}`, sigX, sigY, {
    align: "center",
  });
  doc.text("Penerima,", sigX, sigY + 5, { align: "center" });

  if (withStamp) {
    const stempelData = await loadImageDataURL("/assets/stempel-wift.png");
    if (stempelData) {
      try {
        const size = 35;
        doc.addImage(stempelData, "PNG", sigX - 35, sigY + 5, size, size);
      } catch {}
    }
  }

  if (withSignature) {
    const sigData = await loadImageDataURL("/assets/ttd-manager.png");
    if (sigData) {
      try {
        const w = 35;
        const h = 25;
        doc.addImage(sigData, "PNG", sigX - w / 2, sigY + 7, w, h);
      } catch {}
    }
  }

  doc.setFont("helvetica", "bold");
  doc.text("( Yusri Siti Aisyah., S.Ak )", sigX, sigY + 35, { align: "center" });

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.name} — ${COMPANY.address}`, pageWidth / 2, pageHeight - 15, {
    align: "center",
  });

  return doc;
}
