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
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const transactions = [
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Payments", url: "/payments", icon: CreditCard },
];

const people = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Users & Sales", url: "/users", icon: UserCog },
];

const master = [
  { title: "Products", url: "/products", icon: Package },
  { title: "Categories", url: "/categories", icon: Tags },
  { title: "Material Catalogs", url: "/material-catalogs", icon: BookOpen },
  { title: "Bank Accounts", url: "/bank-accounts", icon: Landmark },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  const renderGroup = (label: string, items: typeof main) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
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
        {renderGroup("Transactions", transactions)}
        {renderGroup("People", people)}
        {renderGroup("Master Data", master)}
      </SidebarContent>
    </Sidebar>
  );
}
