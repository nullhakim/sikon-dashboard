/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem, Customer, Payment, BankAccount } from "./types";

export interface InvoiceOptions {
  withStamp?: boolean;
  withSignature?: boolean;
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

const COMPANY_BANKS = [
  "BCA: 054-1447333 a/n CV. WIJAYA FAMILY TASIKMALAYA",
  "Mandiri: 177-00-1160048-0 a/n CV. WIJAYA FAMILY TASIKMALAYA",
  "BNI: 1286168970 a/n CV. WIJAYA FAMILY TASIKMALAYA",
  "BRI: 0161-01-001461-56-4 a/n CV. WIJAYA FAMILY TASIKMALAYA",
];

const formatCurrency = (value: number) =>
  "Rp " + Math.round(value || 0).toLocaleString("id-ID");

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

// Draw a simple default placeholder logo (rounded square with "W" mark)
function drawPlaceholderLogo(doc: jsPDF, x: number, y: number, size: number) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 3, 3, "F");
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size * 0.6);
  doc.text("W", x + size / 2, y + size * 0.72, { align: "center" });
}

export function generateInvoicePDF({
  order,
  items,
  customer,
  payments = [],
  options,
}: InvoiceData) {
  const { withStamp = false, withSignature = false } = options || {};
  void withStamp;
  void withSignature;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // === 1. HEADER ===
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 50, "F");

  drawPlaceholderLogo(doc, margin - 5, 12, 25);

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
  if (customer?.address) doc.text(customer.address, col1, y + 14, { maxWidth: 80 });
  if (customer?.phone) doc.text(`Tel: ${customer.phone}`, col1, y + 22);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const invNumber = order.order_number
    ? `INV-${order.order_number}`
    : `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const infoLabels = ["No. Invoice", "Tanggal", "Status Order", "Status Bayar"];
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
    const detailStr =
      item.details && Object.keys(item.details).length
        ? "\n" +
          Object.entries(item.details)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "";
    return [
      String(idx + 1),
      (item.product_name ?? "-") + detailStr,
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

  // Payment status badge
  ty += 12;
  const payStatus = (order.payment_status || "unpaid").toLowerCase();
  const badgeColors: Record<string, [number, number, number]> = {
    paid: [34, 197, 94],
    partial: [234, 179, 8],
    unpaid: [239, 68, 68],
  };
  const badgeColor = badgeColors[payStatus] || badgeColors.unpaid;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  const statusText = payStatus.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 12;
  doc.roundedRect(pageWidth - margin - statusWidth, ty - 5, statusWidth, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageWidth - margin - statusWidth / 2, ty, { align: "center" });

  // === 5. BANK INFO ===
  const bankY = finalY + 10;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Informasi Pembayaran:", margin, bankY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  COMPANY_BANKS.forEach((bank, i) => {
    doc.text(bank, margin, bankY + 6 + i * 5);
  });

  if (amountPaid === 0) {
    const minDp = Math.ceil(totalAmount * 0.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68);
    doc.text(
      `* Minimal DP 50%: ${formatCurrency(minDp)}`,
      margin,
      bankY + 6 + COMPANY_BANKS.length * 5 + 2,
    );
    doc.setTextColor(30, 41, 59);
  }

  // === 6. SIGNATURE ===
  const sigY = ty + 20;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hormat Kami,", pageWidth - margin, sigY, { align: "right" });
  doc.text("Manager WIFT Indonesia", pageWidth - margin, sigY + 5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("( Yusri Siti Aisyah., S.Ak )", pageWidth - margin - 25, sigY + 35, {
    align: "center",
  });

  // === 7. WATERMARK LUNAS ===
  if (sisa <= 0 && amountPaid > 0) {
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFontSize(100);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94);
    doc.text("LUNAS", pageWidth / 2, pageHeight / 2 + 20, {
      align: "center",
      angle: 45,
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

  const custName = (customer?.name || "Unknown").replace(/\s+/g, "_");
  const fileName = `Invoice-${custName}-${order.order_number ?? order.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
