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

// ─── Role badge config ─────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-violet-100 text-violet-700 border-violet-200" },
  accounting: { label: "Accounting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sales: { label: "Sales", className: "bg-green-100 text-green-700 border-green-200" },
};

// ─── Menu definitions with role restrictions ──────────────────────────────────

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
  roles?: UserRole[]; // undefined = all roles
};

const main: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Laporan Piutang", url: "/receivables", icon: Receipt, roles: ["owner", "accounting"] },
  { title: "Daily Report", url: "/reports/daily", icon: CalendarDays, roles: ["owner", "accounting"] },
  { title: "Accounting Report", url: "/reports/accounting", icon: ClipboardList, roles: ["owner", "accounting"] },
  { title: "Production Report", url: "/reports/production", icon: Factory, roles: ["owner", "accounting"] },
  { title: "PO Summary", url: "/reports/po-summary", icon: FileBarChart, roles: ["owner", "accounting"] },
];

const transactions: NavItem[] = [
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Batch PO", url: "/batch-pos", icon: Layers, roles: ["owner", "accounting"] },
  { title: "Payments", url: "/payments", icon: CreditCard, roles: ["owner", "accounting"] },
  { title: "Expenses", url: "/expenses", icon: Wallet, roles: ["owner", "accounting"] },
  { title: "Work Logs", url: "/work-logs", icon: ClipboardList, roles: ["owner", "accounting"] },
  { title: "Payrolls", url: "/payrolls", icon: Banknote, roles: ["owner", "accounting"] },
];

const people: NavItem[] = [
  { title: "Workers", url: "/workers", icon: Users, roles: ["owner", "accounting"] },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Users & Sales", url: "/users", icon: UserCog, roles: ["owner"] },
];

const master: NavItem[] = [
  { title: "Products", url: "/products", icon: Package },
  { title: "Categories", url: "/categories", icon: Tags },
  { title: "Expense Categories", url: "/expense-categories", icon: FolderOpen, roles: ["owner", "accounting"] },
  { title: "Material Catalogs", url: "/material-catalogs", icon: BookOpen, roles: ["owner", "accounting"] },
  { title: "Bank Accounts", url: "/bank-accounts", icon: Landmark, roles: ["owner", "accounting"] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

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

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = filterByRole(items);
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive(item.url)}>
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
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
            <span className="text-sm font-semibold">SIKOn</span>
            <span className="text-[10px] text-muted-foreground">
              Sistem Integrasi Konveksi
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Overview", main)}
        {renderGroup("Transaksi", transactions)}
        {renderGroup("Orang", people)}
        {renderGroup("Master Data", master)}
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
                  {roleBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
