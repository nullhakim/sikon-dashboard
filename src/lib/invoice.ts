/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem, Customer, Payment, BankAccount } from "./types";

export interface InvoiceOptions {
  withStamp?: boolean;
  withSignature?: boolean;
  note?: string;
  isNota?: boolean;
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

function formatOrderDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const partsList: string[] = [];

  const extractParts = (arr: any[]) => {
    arr.forEach((d) => {
      if (!d.part && !d.material_name && !d.warna) return;
      const inner: string[] = [];
      if (d.material_name) inner.push(String(d.material_name));
      if (d.warna) inner.push(String(d.warna));

      if (inner.length) partsList.push(`Bahan: ${inner.join(" - ")}`);
    });
  };

  if (Array.isArray(details)) {
    extractParts(details);
    return partsList.join("\n");
  }

  const d = details as Record<string, any>;

  if (Array.isArray(d.parts)) {
    extractParts(d.parts);
  } else {
    // Legacy shape
    const bahan = d.Bahan ?? d.bahan;
    if (bahan && typeof bahan === "object") {
      const b = bahan as Record<string, any>;
      const inner: string[] = [];
      if (b.Name ?? b.name) inner.push(String(b.Name ?? b.name));
      if (b.Color ?? b.color) inner.push(String(b.Color ?? b.color));
      if (inner.length) partsList.push(`Bahan: ${inner.join(" - ")}`);
    } else if (typeof bahan === "string" && bahan.trim()) {
      partsList.push(`Bahan: ${bahan}`);
    }
    const warna = d.Warna ?? d.warna;
    if (warna) partsList.push(`Warna: ${warna}`);
  }

  return partsList.join("\n");
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

  // === INVOICE DATE LOGIC ===
  // Gunakan approved_at sebagai tanggal invoice resmi.
  // Jika kosong (order masih quotation), gunakan created_at sebagai fallback
  // dan ubah judul menjadi "PROFORMA INVOICE".
  const isProforma = !options?.isNota && !order.approved_at;
  const invoiceDate = order.approved_at ? order.approved_at : order.created_at;

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
      doc.addImage(logoData, "PNG", margin - 5, 12, 25, 25, undefined, "FAST");
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

  // Judul dokumen: NOTA / PROFORMA INVOICE / INVOICE
  const title = options?.isNota ? "NOTA" : isProforma ? "INVOICE" : "INVOICE";
  doc.setFontSize(isProforma ? 18 : 28);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth - margin, 46, { align: "right" });

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
  const customerNameMaxWidth = col2 - col1 - 10;
  const customerNameLines = doc.splitTextToSize(customer?.name || "-", customerNameMaxWidth);
  doc.text(customerNameLines, col1, y + 7, { maxWidth: customerNameMaxWidth });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const customerDetailsY = y + 7 + customerNameLines.length * 5 + 2;
  // if (customer?.address) doc.text(customer.address, col1, y + 14, { maxWidth: 80 });
  // if (customer?.phone) doc.text(`Tel: ${customer.phone}`, col1, y + 22);
  doc.text("Address: ", col1, customerDetailsY, { maxWidth: 80 });
  doc.text("Phone: ", col1, customerDetailsY + 8);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const prefix = options?.isNota ? "NOTA-" : "INV-";
  const invNumber = order.order_number
    ? `${prefix}${order.order_number}`
    : `${prefix}${order.id.slice(0, 8).toUpperCase()}`;
  const invoiceDateLabel = options?.isNota
    ? "No. Nota"
    : isProforma
      ? "No. Penawaran"
      : "No. Invoice";
  const infoLabels = [invoiceDateLabel, "Tanggal"];
  // Tanggal: untuk nota gunakan created_at order, untuk invoice gunakan approved_at (atau created_at jika proforma)
  const infoValues = [
    invNumber,
    options?.isNota ? formatDate(order.created_at) : formatDate(invoiceDate),
    (order.order_status || "pending").toUpperCase(),
    (order.payment_status || "unpaid").toUpperCase(),
  ];
  // Tambahkan label PROFORMA di bawah judul jika perlu
  if (isProforma) {
    doc.setTextColor(200, 100, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    // doc.text("(Dokumen Penawaran — Belum Disetujui)", pageWidth - margin, 50, { align: "right" });
    doc.setTextColor(30, 41, 59);
  }

  infoLabels.forEach((label, i) => {
    const ly = y + i * 8;
    doc.setFont("helvetica", "bold");
    doc.text(label, col2, ly);
    doc.setFont("helvetica", "normal");
    doc.text(`: ${infoValues[i]}`, col2 + 35, ly);
  });

  // === 3. ITEMS TABLE ===
  y = y + Math.max(38, customerDetailsY - y + 18);

  const tableBody = items.map((item, idx) => {
    const subtotal = item.subtotal ?? item.qty * item.price;
    const detailStr = formatOrderDetails(item.details);
    return [
      String(idx + 1),
      (item.custom_name || item.product_name || item.product?.name || "-") +
        (detailStr ? "\n" + detailStr : ""),
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
  const totalsX = pageWidth - margin - 85;

  const subtotal = items.reduce((s, i) => s + (i.subtotal ?? i.qty * i.price), 0);
  const shippingCost = order.shipping_cost || 0;

  const isTaxable = order.is_taxable ?? false;
  const ppnRate = order.tax_ppn_rate ?? 12.00;
  const pph22Rate = order.tax_pph22_rate ?? 1.50;

  const dppPpn = order.dpp_ppn ?? (isTaxable ? subtotal / 1.09 : 0);
  const ppnAmount = order.ppn_amount ?? (isTaxable ? dppPpn * (ppnRate / 100) : 0);
  const pph22Amount = order.pph22_amount ?? (isTaxable ? dppPpn * (pph22Rate / 100) : 0);

  const paguBelanja = order.pagu_belanja ?? (isTaxable ? subtotal + shippingCost + ppnAmount : subtotal + shippingCost);
  const totalAmount = isTaxable ? paguBelanja : (order.total_amount ?? subtotal + shippingCost);
  const amountPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  let ty = finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, ty);
  doc.text(formatCurrency(subtotal), pageWidth - margin, ty, { align: "right" });

  if (isTaxable) {
    ty += 7;
    doc.text("DPP PPN", totalsX, ty);
    doc.text(formatCurrency(dppPpn), pageWidth - margin, ty, { align: "right" });

    ty += 7;
    doc.text(`PPN (${ppnRate}%)`, totalsX, ty);
    doc.text(`+ ${formatCurrency(ppnAmount)}`, pageWidth - margin, ty, { align: "right" });

    ty += 7;
    doc.text(`PPh 22 (${pph22Rate}%)`, totalsX, ty);
    doc.text(`- ${formatCurrency(pph22Amount)}`, pageWidth - margin, ty, { align: "right" });
  }

  if (shippingCost > 0) {
    ty += 7;
    const shippingLabel = order.courier_name ? `Ongkir (${order.courier_name})` : "Ongkir";
    doc.text(shippingLabel, totalsX, ty);
    doc.text(formatCurrency(shippingCost), pageWidth - margin, ty, { align: "right" });
  }

  ty += 7;
  doc.setFont("helvetica", "bold");
  doc.text(isTaxable ? "Pagu Belanja" : "Total", totalsX, ty);
  doc.text(formatCurrency(totalAmount), pageWidth - margin, ty, { align: "right" });

  ty += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Sudah Dibayar", totalsX, ty);
  doc.text(formatCurrency(amountPaid), pageWidth - margin, ty, { align: "right" });

  ty += 4;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(totalsX, ty, pageWidth - margin, ty);

  ty += 8;
  const sisa = Math.max(0, totalAmount - amountPaid);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Sisa Tagihan", totalsX, ty);
  doc.text(formatCurrency(sisa), pageWidth - margin, ty, { align: "right" });

  // Terbilang (amount in words) — only when there's a remaining balance
  if (sisa > 0) {
    ty += 7;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const terbilangText = `Terbilang: ${terbilang(sisa)}`;
    const terbilangLines = doc.splitTextToSize(terbilangText, 85);
    doc.text(terbilangLines, totalsX, ty);
    doc.setTextColor(30, 41, 59);
  }

  // === 5. BANK INFO ===
  const bankY = finalY + 10;
  let currentLeftY = bankY;

  if (!options?.isNota) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Informasi Pembayaran:", margin, currentLeftY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const bankLines = bankAccounts.length
      ? bankAccounts.map(formatBankLine)
      : ["(Belum ada rekening sales yang terdaftar)"];

    currentLeftY += 6;
    bankLines.forEach((line) => {
      const splitLines = doc.splitTextToSize(line, 80);
      doc.text(splitLines, margin, currentLeftY);
      currentLeftY += splitLines.length * 4.5;
    });
    currentLeftY += 2;
  }

  if (isTaxable) {
    currentLeftY += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const taxNote = `Catatan: Transaksi ini termasuk Pengadaan Dinas/Instansi Pemerintah dengan Pemotongan PPh 22 sebesar ${pph22Rate}% (${formatCurrency(pph22Amount)}) dan PPN ${ppnRate}% (${formatCurrency(ppnAmount)}).`;
    const taxNoteLines = doc.splitTextToSize(taxNote, 80);
    doc.text(taxNoteLines, margin, currentLeftY);
    currentLeftY += taxNoteLines.length * 4.5;
    doc.setTextColor(30, 41, 59);
  }

  if (options?.note) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68);
    const noteLines = doc.splitTextToSize(options.note, 80);
    doc.text(noteLines, margin, currentLeftY);
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
        doc.addImage(
          stempelData,
          "PNG",
          pageWidth - margin - 70,
          sigY + 5,
          size,
          size,
          undefined,
          "FAST",
        );
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
        doc.addImage(
          sigData,
          "PNG",
          pageWidth - margin - 25 - w / 2,
          sigY + 7,
          w,
          h,
          undefined,
          "FAST",
        );
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
      doc.addImage(logoData, "PNG", margin, 12, 25, 25, undefined, "FAST");
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
      const pName = item.custom_name || item.product_name || item.product?.name || "Produk";
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
  // Tanggal kwitansi: selalu gunakan payment.created_at (tanggal aktual uang diterima)
  // payment.payment_date digunakan hanya jika created_at tidak tersedia
  const kwitansiDate = payment.created_at || payment.payment_date;
  doc.text(`Tasikmalaya, ${formatDate(kwitansiDate)}`, sigX, sigY, {
    align: "center",
  });
  doc.text("Penerima,", sigX, sigY + 5, { align: "center" });

  if (withStamp) {
    const stempelData = await loadImageDataURL("/assets/stempel-wift.png");
    if (stempelData) {
      try {
        const size = 35;
        doc.addImage(stempelData, "PNG", sigX - 35, sigY + 5, size, size, undefined, "FAST");
      } catch {
        // Ignore invalid stamp images and continue generating the invoice.
      }
    }
  }

  if (withSignature) {
    const sigData = await loadImageDataURL("/assets/ttd-manager.png");
    if (sigData) {
      try {
        const w = 35;
        const h = 25;
        doc.addImage(sigData, "PNG", sigX - w / 2, sigY + 7, w, h, undefined, "FAST");
      } catch {
        // Ignore invalid signature images and continue generating the invoice.
      }
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
