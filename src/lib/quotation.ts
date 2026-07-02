/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Order, OrderItem, Customer, BankAccount } from "./types";

const COMPANY = {
  name: "WIFT INDONESIA",
  tagline: "Solusi Seragam Kantor Terpercaya",
  address:
    "Jl. Mangunreja Singaparna Kp. Kebon Kalapa, Kel.Cibalanarik, Kec. Tanjungjaya, Kab. Tasikmalaya",
  phone: "0265-7543224",
  email: "wijayafamily.wft@gmail.com",
  website: "wiftindonesia.com",
};

const fmtIDR = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

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

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function printQuotation({
  order,
  items,
  customer,
  bankAccounts,
}: {
  order: Order;
  items: OrderItem[];
  customer: Customer | null;
  bankAccounts?: BankAccount[];
}) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const shipping = order.shipping_cost || 0;
  const total = order.total_amount || subtotal + shipping;

  const rowsHtml = items
    .map((it, idx) => {
      const name = escapeHtml(it.product_name || it.product?.name || "—");
      const detailEntries = it.details ? Object.entries(it.details as Record<string, any>) : [];
      const specs =
        detailEntries.length > 0
          ? `<div class="specs">${detailEntries
            .map(
              ([k, v]) =>
                `<span><strong>${escapeHtml(String(k))}:</strong> ${escapeHtml(
                  String(v),
                )}</span>`,
            )
            .join("")}</div>`
          : "";
      return `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>
            <div class="prod">${name}</div>
            ${specs}
          </td>
          <td class="center">${it.qty}</td>
          <td class="right">${fmtIDR(it.price)}</td>
          <td class="right">${fmtIDR(it.qty * it.price)}</td>
        </tr>
      `;
    })
    .join("");

  const salesBanks = (bankAccounts || []).filter(
    (b) => !!b.user_id && !!order.sales && b.user_id === order.sales.id,
  );
  const globalBanks = (bankAccounts || []).filter((b) => b.is_global);
  const banksToShow = salesBanks.length ? salesBanks : globalBanks;
  const bankHtml = banksToShow.length
    ? `<div class="payment"><h3>Informasi Pembayaran</h3><div class="body">${banksToShow
      .map(
        (b) =>
          `${escapeHtml(b.bank_name)}: ${escapeHtml(b.account_number)} a/n ${escapeHtml(
            b.account_name,
          )}`,
      )
      .join("<br />")}</div></div>`
    : "";

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Quotation ${escapeHtml(order.order_number || order.id)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica", "Arial", sans-serif;
    color: #111827;
    margin: 0;
    font-size: 11pt;
    line-height: 1.45;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1e293b;
    padding-bottom: 14px;
    margin-bottom: 18px;
  }
  .company .name { font-size: 18pt; font-weight: 800; letter-spacing: 0.5px; color: #1e293b; }
  .company .tag { color: #64748b; font-size: 9.5pt; margin-top: 2px; }
  .company .meta { font-size: 9pt; color: #475569; margin-top: 6px; max-width: 320px; }
  .company img { height: 48px; margin-right: 12px; vertical-align: middle; }
  .doc-title {
    text-align: right;
  }
  .doc-title h1 {
    margin: 0;
    font-size: 22pt;
    color: #1e293b;
    letter-spacing: 2px;
  }
  .doc-title .num { font-family: monospace; color: #475569; margin-top: 4px; }
  .doc-title .date { color: #64748b; font-size: 9.5pt; margin-top: 2px; }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 18px;
  }
  .payment { margin-top: 12px; }
  .signature-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 36px;
    padding-right: 20px;
  }
  .signature {
    text-align: center;
    width: 260px;
    position: relative;
  }
  .signature .images {
    position: relative;
    height: 100px;
    margin: 5px 0;
  }
  .signature .stamp {
    position: absolute;
    left: 0;
    top: -15px;
    height: 110px;
    opacity: 0.85;
    z-index: 1;
  }
  .signature .sign {
    position: absolute;
    right: 40px;
    top: 10px;
    height: 80px;
    z-index: 2;
  }
  .signature .name {
    font-weight: 700;
    margin-top: 8px;
  }
  .info h3 {
    margin: 0 0 6px 0;
    font-size: 9pt;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 1px;
  }
  .info .body { font-size: 10.5pt; }
  .info .body .name { font-weight: 700; }

  .valid-box {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 10px 14px;
    margin-bottom: 18px;
    font-size: 10pt;
  }
  .valid-box strong { color: #92400e; }

  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 10pt;
  }
  table.items thead th {
    background: #1e293b;
    color: white;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 9.5pt;
  }
  table.items tbody td {
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  table.items td.num { width: 32px; text-align: center; color: #64748b; }
  table.items td.center { text-align: center; }
  table.items td.right { text-align: right; }
  table.items .prod { font-weight: 600; color: #2563eb; }
  table.items .specs { margin-top: 4px; font-size: 9pt; color: #475569; }
  table.items .specs span { display: inline-block; margin-right: 10px; }

  .totals {
    width: 280px;
    margin-left: auto;
    font-size: 10.5pt;
  }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.grand {
    border-top: 2px solid #1e293b;
    margin-top: 6px;
    padding-top: 8px;
    font-weight: 700;
    font-size: 12pt;
  }
  .totals .label { color: #475569; }

  .terms {
    margin-top: 26px;
    padding: 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .terms h3 {
    margin: 0 0 8px 0;
    font-size: 10pt;
    text-transform: uppercase;
    color: #1e293b;
    letter-spacing: 1px;
  }
  .terms .body {
    white-space: pre-wrap;
    font-size: 10pt;
    color: #334155;
  }

  .footer {
    margin-top: 36px;
    text-align: center;
    color: #64748b;
    font-size: 9pt;
    border-top: 1px solid #e5e7eb;
    padding-top: 10px;
  }

  .print-bar {
    position: fixed;
    top: 12px;
    right: 12px;
    background: #1e293b;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 11pt;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }
  @media print {
    .print-bar { display: none; }
  }
</style>
</head>
<body>
  <button class="print-bar" onclick="window.print()">🖨 Print</button>

  <div class="header">
    <div class="company">
      <img src="/assets/logo.png" alt="logo" />
      <div style="display:inline-block;vertical-align:middle">
        <div class="name">${escapeHtml(COMPANY.name)}</div>
        <div class="tag">${escapeHtml(COMPANY.tagline)}</div>
        <div class="meta">
          ${escapeHtml(COMPANY.address)}<br />
          Telp: ${escapeHtml(COMPANY.phone)} · ${escapeHtml(COMPANY.email)}<br />
          ${escapeHtml(COMPANY.website)}
        </div>
      </div>
    </div>
    <div class="doc-title">
      <h1>QUOTATION</h1>
      <div class="num">No. ${escapeHtml(order.order_number || order.id.slice(0, 8))}</div>
      <div class="date">Tanggal: ${fmtDate(order.created_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info">
      <h3>Kepada Yth.</h3>
      <div class="body">
        <div class="name">${escapeHtml(customer?.name || "—")}</div>
        ${customer?.phone ? `<div>${escapeHtml(customer.phone)}</div>` : ""}
        ${customer?.email ? `<div>${escapeHtml(customer.email)}</div>` : ""}
        ${customer?.address ? `<div>${escapeHtml(customer.address)}</div>` : ""}
      </div>
    </div>
    <div class="info">
      <h3>Sales</h3>
      <div class="body">
        <div class="name">${escapeHtml(order.sales?.name || "—")}</div>
        ${order.sales?.email ? `<div>${escapeHtml(order.sales.email)}</div>` : ""}
        ${order.courier_name ? `<div>Kurir: ${escapeHtml(order.courier_name)}</div>` : ""}
      </div>
    </div>
  </div>

  ${order.valid_until
      ? `<div class="valid-box">
          <strong>Berlaku sampai:</strong> ${fmtDate(order.valid_until)}
        </div>`
      : ""
    }

  ${bankHtml}

  <table class="items">
    <thead>
      <tr>
        <th>#</th>
        <th>Deskripsi Produk</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Harga</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="5" style="text-align:center;color:#64748b;padding:20px">Tidak ada item.</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="label">Subtotal</span><span>${fmtIDR(subtotal)}</span></div>
    <div class="row"><span class="label">Pengiriman</span><span>${fmtIDR(shipping)}</span></div>
    <div class="row grand"><span>TOTAL</span><span>${fmtIDR(total)}</span></div>
  </div>

  ${order.terms_conditions
      ? `<div class="terms">
          <h3>Syarat &amp; Ketentuan</h3>
          <div class="body">${escapeHtml(order.terms_conditions)}</div>
        </div>`
      : ""
    }

  ${order.notes
      ? `<div class="terms">
          <h3>Catatan</h3>
          <div class="body">${escapeHtml(order.notes)}</div>
        </div>`
      : ""
    }

  <div class="footer">
    Terima kasih atas kepercayaan Anda kepada ${escapeHtml(COMPANY.name)}.
  </div>

  <div class="signature-wrapper">
    <div class="signature">
      <div>Hormat Kami,</div>
      <div>Manager WIFT Indonesia</div>
      <div class="images">
        <img src="/assets/stempel-wift.png" class="stamp" alt="Stempel" />
        <img src="/assets/ttd-manager.png" class="sign" alt="Tanda Tangan" />
      </div>
      <div class="name">( Yusri Siti Aisyah., S.Ak )</div>
    </div>
  </div>

  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Pop-up diblokir. Izinkan pop-up untuk mencetak quotation.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
