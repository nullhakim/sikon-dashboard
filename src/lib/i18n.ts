// Centralized i18n dictionary for SIKOn ERP.

export type Language = "id" | "en";

export const translations = {
  id: {
    // Menu Sidebar
    "nav.overview": "Ikhtisar",
    "nav.dashboard": "Dashboard",
    "nav.receivables": "Laporan Piutang",
    "nav.daily_report": "Laporan Harian",
    "nav.accounting_report": "Laporan Akuntansi",
    "nav.production_report": "Laporan Produksi",
    "nav.po_summary": "Ringkasan PO",

    "nav.transactions": "Transaksi",
    "nav.orders": "Pesanan (Orders)",
    "nav.batch_pos": "Batch PO",
    "nav.payments": "Pembayaran",
    "nav.expenses": "Pengeluaran",
    "nav.work_logs": "Catatan Kerja",
    "nav.payrolls": "Penggajian (Payrolls)",

    "nav.people": "Sumber Daya & Orang",
    "nav.workers": "Pekerja",
    "nav.customers": "Pelanggan",
    "nav.users_sales": "Pengguna & Sales",

    "nav.master": "Data Master",
    "nav.products": "Produk",
    "nav.categories": "Kategori Produk",
    "nav.expense_categories": "Kategori Pengeluaran",
    "nav.material_catalogs": "Katalog Bahan",
    "nav.bank_accounts": "Rekening Bank",

    // Common Actions & Controls
    "action.search": "Cari...",
    "action.add": "Tambah",
    "action.create": "Buat Baru",
    "action.edit": "Ubah",
    "action.delete": "Hapus",
    "action.save": "Simpan",
    "action.cancel": "Batal",
    "action.back": "Kembali",
    "action.filter": "Filter",
    "action.export": "Ekspor",
    "action.import": "Impor",
    "action.refresh": "Muat Ulang",
    "action.detail": "Detail",
    "action.verify": "Verifikasi",
    "action.reject": "Tolak",
    "action.logout": "Keluar",
    "action.login": "Masuk",
    "action.try_again": "Coba Lagi",
    "action.go_home": "Kembali ke Dashboard",

    // Common Status
    "status.all": "Semua",
    "status.active": "Aktif",
    "status.inactive": "Nonaktif",
    "status.pending": "Menunggu",
    "status.completed": "Selesai",
    "status.canceled": "Dibatalkan",
    "status.verified": "Terverifikasi",
    "status.rejected": "Ditolak",
    "status.draft": "Draf",
    "status.paid": "Lunas",
    "status.unpaid": "Belum Bayar",
    "status.partial": "DP / Cicilan",
    "status.partially_paid": "DP / Cicilan",

    // Order Status Specifics
    "order_status.quotation": "Quotation",
    "order_status.pending": "Menunggu (Pending)",
    "order_status.production": "Produksi",
    "order_status.ready": "Siap Kirim",
    "order_status.completed": "Selesai",
    "order_status.canceled": "Dibatalkan",

    // Payment Status Specifics
    "payment_status.unpaid": "Belum Bayar",
    "payment_status.partial": "Cicilan / DP",
    "payment_status.paid": "Lunas",
    "payment_status.pending": "Menunggu Verifikasi",
    "payment_status.verified": "Terverifikasi",
    "payment_status.rejected": "Ditolak",

    // Payment Type Specifics
    "payment_type.dp": "DP (Uang Muka)",
    "payment_type.settlement": "Pelunasan",
    "payment_type.installment": "Cicilan",

    // Header & User
    "header.role_owner": "Pemilik",
    "header.role_accounting": "Akuntansi",
    "header.role_sales": "Sales",
    "header.system_title": "Sistem Integrasi Konveksi",

    // Root Error Pages
    "error.404_title": "Halaman Tidak Ditemukan",
    "error.404_desc": "Halaman yang Anda cari tidak ada atau telah dipindahkan.",
    "error.page_error_title": "Gagal Memuat Halaman",

    // Dashboard
    "dashboard.title": "Ikhtisar Dashboard",
    "dashboard.subtitle": "Ringkasan operasional konveksi, tren omset, dan tindakan yang membutuhkan perhatian.",
    "dashboard.manage_orders": "Kelola Pesanan",
    "dashboard.active_orders_revenue": "Pesanan Aktif & Penerimaan",
    "dashboard.total_revenue": "Total Omset (Revenue)",
    "dashboard.total_receivables": "Total Piutang",
    "dashboard.active_batch_po": "Batch PO Aktif",
    "dashboard.no_active_po": "Tidak ada Batch PO aktif",
    "dashboard.chart_title": "Tren Omset & Cash-In (14 Hari Terakhir)",
    "dashboard.chart_subtitle": "Perbandingan performa penjualan dan penerimaan kas harian",
    "dashboard.action_required": "Butuh Tindakan Operasional",
    "dashboard.action_required_sub": "Daftar antrean transaksi yang memerlukan verifikasi atau pengiriman",
    "dashboard.unverified_payments": "Pembayaran Menunggu Verifikasi",
    "dashboard.unverified_payments_desc": "Verifikasi bukti transfer dari pelanggan",
    "dashboard.ready_orders": "Order Siap Kirim (Ready)",
    "dashboard.ready_orders_desc": "Pesanan selesai produksi Siap Kirim",
    "dashboard.pending_orders": "Order Pending Approval",
    "dashboard.pending_orders_desc": "Order baru menunggu pembayaran DP",
    "dashboard.recent_orders": "Pesanan Terbaru",
    "dashboard.recent_orders_sub": "6 data pesanan terbaru di seluruh Batch PO",
    "dashboard.recent_payments": "Pembayaran Terbaru",
    "dashboard.recent_payments_sub": "6 data transaksi pembayaran terbaru",
  },
  en: {
    // Menu Sidebar
    "nav.overview": "Overview",
    "nav.dashboard": "Dashboard",
    "nav.receivables": "Receivables Report",
    "nav.daily_report": "Daily Report",
    "nav.accounting_report": "Accounting Report",
    "nav.production_report": "Production Report",
    "nav.po_summary": "PO Summary",

    "nav.transactions": "Transactions",
    "nav.orders": "Orders",
    "nav.batch_pos": "Batch PO",
    "nav.payments": "Payments",
    "nav.expenses": "Expenses",
    "nav.work_logs": "Work Logs",
    "nav.payrolls": "Payrolls",

    "nav.people": "People & HR",
    "nav.workers": "Workers",
    "nav.customers": "Customers",
    "nav.users_sales": "Users & Sales",

    "nav.master": "Master Data",
    "nav.products": "Products",
    "nav.categories": "Product Categories",
    "nav.expense_categories": "Expense Categories",
    "nav.material_catalogs": "Material Catalogs",
    "nav.bank_accounts": "Bank Accounts",

    // Common Actions & Controls
    "action.search": "Search...",
    "action.add": "Add",
    "action.create": "Create New",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.back": "Back",
    "action.filter": "Filter",
    "action.export": "Export",
    "action.import": "Import",
    "action.refresh": "Refresh",
    "action.detail": "Detail",
    "action.verify": "Verify",
    "action.reject": "Reject",
    "action.logout": "Logout",
    "action.login": "Login",
    "action.try_again": "Try Again",
    "action.go_home": "Go to Dashboard",

    // Common Status
    "status.all": "All",
    "status.active": "Active",
    "status.inactive": "Inactive",
    "status.pending": "Pending",
    "status.completed": "Completed",
    "status.canceled": "Canceled",
    "status.verified": "Verified",
    "status.rejected": "Rejected",
    "status.draft": "Draft",
    "status.paid": "Paid",
    "status.unpaid": "Unpaid",
    "status.partial": "Partially Paid",
    "status.partially_paid": "Partially Paid",

    // Order Status Specifics
    "order_status.quotation": "Quotation",
    "order_status.pending": "Pending",
    "order_status.production": "Production",
    "order_status.ready": "Ready to Ship",
    "order_status.completed": "Completed",
    "order_status.canceled": "Canceled",

    // Payment Status Specifics
    "payment_status.unpaid": "Unpaid",
    "payment_status.partial": "Partially Paid",
    "payment_status.paid": "Paid",
    "payment_status.pending": "Pending Verification",
    "payment_status.verified": "Verified",
    "payment_status.rejected": "Rejected",

    // Payment Type Specifics
    "payment_type.dp": "DP (Down Payment)",
    "payment_type.settlement": "Settlement",
    "payment_type.installment": "Installment",

    // Header & User
    "header.role_owner": "Owner",
    "header.role_accounting": "Accounting",
    "header.role_sales": "Sales",
    "header.system_title": "Confectionery Integration System",

    // Root Error Pages
    "error.404_title": "Page Not Found",
    "error.404_desc": "The page you're looking for doesn't exist or has been moved.",
    "error.page_error_title": "Failed to Load Page",

    // Dashboard
    "dashboard.title": "Dashboard Overview",
    "dashboard.subtitle": "Overview of confectionery operations, revenue trends, and items requiring attention.",
    "dashboard.manage_orders": "Manage Orders",
    "dashboard.active_orders_revenue": "Active Orders & Revenue",
    "dashboard.total_revenue": "Total Revenue",
    "dashboard.total_receivables": "Total Receivables",
    "dashboard.active_batch_po": "Active Batch PO",
    "dashboard.no_active_po": "No active Batch PO currently",
    "dashboard.chart_title": "Revenue & Cash-In Trend (Last 14 Days)",
    "dashboard.chart_subtitle": "Comparison of daily sales performance and cash received",
    "dashboard.action_required": "Operational Action Required",
    "dashboard.action_required_sub": "Transaction queue requiring verification or shipping",
    "dashboard.unverified_payments": "Payments Pending Verification",
    "dashboard.unverified_payments_desc": "Verify transfer receipts from customers",
    "dashboard.ready_orders": "Orders Ready for Shipping",
    "dashboard.ready_orders_desc": "Production finished and ready for shipment",
    "dashboard.pending_orders": "Orders Pending Approval",
    "dashboard.pending_orders_desc": "New orders awaiting down payment",
    "dashboard.recent_orders": "Recent Orders",
    "dashboard.recent_orders_sub": "Latest 6 order records across all Batch POs",
    "dashboard.recent_payments": "Recent Payments",
    "dashboard.recent_payments_sub": "Latest 6 payment transaction records",
  },
};

export type TranslationKey = keyof typeof translations.id;
