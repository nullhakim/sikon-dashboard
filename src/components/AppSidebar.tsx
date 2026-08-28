import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Users,
  UserCog,
  Package,
  Tags,
  Landmark,
  BookOpen,
  Layers,
  ClipboardList,
  Factory,
  Wallet,
  FolderOpen,
  CalendarDays,
  CalendarCheck,
  FileBarChart,
  Receipt,
  Banknote,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/lib/types/auth";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";

import { useQuery } from "@tanstack/react-query";
import { paymentsService } from "@/lib/services";

// ─── Role badge config ─────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, { labelKey: TranslationKey; defaultLabel: string; className: string }> = {
  owner: { labelKey: "header.role_owner", defaultLabel: "Owner", className: "bg-violet-100 text-violet-700 border-violet-200" },
  accounting: { labelKey: "header.role_accounting", defaultLabel: "Accounting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sales: { labelKey: "header.role_sales", defaultLabel: "Sales", className: "bg-green-100 text-green-700 border-green-200" },
};

// ─── Menu definitions with role restrictions ──────────────────────────────────

type NavItem = {
  titleKey: TranslationKey;
  defaultTitle: string;
  url: string;
  icon: React.ElementType;
  roles?: UserRole[]; // undefined = all roles
};

const main: NavItem[] = [
  { titleKey: "nav.dashboard", defaultTitle: "Dashboard", url: "/", icon: LayoutDashboard },
  { titleKey: "nav.receivables", defaultTitle: "Laporan Piutang", url: "/receivables", icon: Receipt, roles: ["owner", "accounting"] },
  { titleKey: "nav.daily_report", defaultTitle: "Laporan Harian", url: "/reports/daily", icon: CalendarDays, roles: ["owner", "accounting"] },
  { titleKey: "nav.accounting_report", defaultTitle: "Laporan Akuntansi", url: "/reports/accounting", icon: ClipboardList, roles: ["owner", "accounting"] },
  { titleKey: "nav.production_report", defaultTitle: "Laporan Produksi", url: "/reports/production", icon: Factory, roles: ["owner", "accounting"] },
  { titleKey: "nav.po_summary", defaultTitle: "Ringkasan PO", url: "/reports/po-summary", icon: FileBarChart, roles: ["owner", "accounting"] },
];

const transactions: NavItem[] = [
  { titleKey: "nav.orders", defaultTitle: "Pesanan (Orders)", url: "/orders", icon: ShoppingCart },
  { titleKey: "nav.batch_pos", defaultTitle: "Batch PO", url: "/batch-pos", icon: Layers, roles: ["owner", "accounting"] },
  { titleKey: "nav.payments", defaultTitle: "Pembayaran", url: "/payments", icon: CreditCard, roles: ["owner", "accounting"] },
  { titleKey: "nav.expenses", defaultTitle: "Pengeluaran", url: "/expenses", icon: Wallet, roles: ["owner", "accounting"] },
  { titleKey: "nav.work_logs", defaultTitle: "Catatan Kerja", url: "/work-logs", icon: ClipboardList, roles: ["owner", "accounting"] },
  { titleKey: "nav.attendances", defaultTitle: "Absensi (Attendances)", url: "/attendances", icon: CalendarCheck, roles: ["owner", "accounting"] },
  { titleKey: "nav.payrolls", defaultTitle: "Penggajian (Payrolls)", url: "/payrolls", icon: Banknote, roles: ["owner", "accounting"] },
];

const people: NavItem[] = [
  { titleKey: "nav.workers", defaultTitle: "Pekerja", url: "/workers", icon: Users, roles: ["owner", "accounting"] },
  { titleKey: "nav.customers", defaultTitle: "Pelanggan", url: "/customers", icon: Users },
  { titleKey: "nav.users_sales", defaultTitle: "Pengguna & Sales", url: "/users", icon: UserCog, roles: ["owner"] },
];

const master: NavItem[] = [
  { titleKey: "nav.products", defaultTitle: "Produk", url: "/products", icon: Package },
  { titleKey: "nav.categories", defaultTitle: "Kategori Produk", url: "/categories", icon: Tags },
  { titleKey: "nav.expense_categories", defaultTitle: "Kategori Pengeluaran", url: "/expense-categories", icon: FolderOpen, roles: ["owner", "accounting"] },
  { titleKey: "nav.material_catalogs", defaultTitle: "Katalog Bahan", url: "/material-catalogs", icon: BookOpen, roles: ["owner", "accounting"] },
  { titleKey: "nav.bank_accounts", defaultTitle: "Rekening Bank", url: "/bank-accounts", icon: Landmark, roles: ["owner", "accounting"] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const role = user?.role as UserRole | undefined;

  const paymentsQ = useQuery({
    queryKey: ["payments", "sidebar-pending-count"],
    queryFn: () => paymentsService.list({ limit: 100 }),
    enabled: role === "owner" || role === "accounting",
  });

  const pendingCount = (paymentsQ.data?.data ?? []).filter(
    (p) => (p.status || "pending").toLowerCase() === "pending"
  ).length;

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    if (url === "/reports") return pathname === "/reports" || pathname === "/reports/";
    return pathname === url || pathname.startsWith(url + "/");
  };

  /** Filter items by role — items with no role restriction are visible to all */
  const filterByRole = (items: NavItem[]) => {
    if (!role) return [];
    return items.filter((item) => !item.roles || item.roles.includes(role));
  };

  const renderGroup = (groupLabelKey: TranslationKey, defaultGroupLabel: string, items: NavItem[]) => {
    const visible = filterByRole(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{t(groupLabelKey, defaultGroupLabel)}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <Link to={item.url} className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t(item.titleKey, item.defaultTitle)}</span>
                    </div>
                    {item.url === "/payments" && pendingCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white leading-none shrink-0">
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const roleBadge = role ? ROLE_BADGE[role] : null;
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shrink-0">
            S
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">SIKOn ERP</span>
            <span className="text-[10px] text-muted-foreground">
              {t("header.system_title")}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("nav.overview", "Ikhtisar", main)}
        {renderGroup("nav.transactions", "Transaksi", transactions)}
        {renderGroup("nav.people", "Sumber Daya & Orang", people)}
        {renderGroup("nav.master", "Data Master", master)}
      </SidebarContent>

      {/* User profile card at bottom */}
      {user && (
        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2 px-2 py-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={user.image_url} alt={user.name} />
              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-medium truncate">{user.name}</span>
              {roleBadge && (
                <Badge
                  variant="outline"
                  className={`w-fit mt-0.5 h-4 px-1.5 text-[10px] font-medium ${roleBadge.className}`}
                >
                  {t(roleBadge.labelKey, roleBadge.defaultLabel)}
                </Badge>
              )}
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

