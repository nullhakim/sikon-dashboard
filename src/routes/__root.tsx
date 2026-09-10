import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/lib/auth-store";
import { canAccess } from "@/lib/types/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// ─── Role badge styles ────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { labelKey: "header.role_owner" | "header.role_accounting" | "header.role_sales"; defaultLabel: string; className: string }> = {
  owner: { labelKey: "header.role_owner", defaultLabel: "Owner", className: "bg-violet-100 text-violet-700 border-violet-200" },
  accounting: { labelKey: "header.role_accounting", defaultLabel: "Accounting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sales: { labelKey: "header.role_sales", defaultLabel: "Sales", className: "bg-green-100 text-green-700 border-green-200" },
};

function NotFoundComponent() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("error.404_title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("error.404_desc")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("action.go_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("error.page_error_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("action.try_again")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("action.go_home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SIKOn — Sistem Integrasi Konveksi Online" },
      {
        name: "description",
        content:
          "SIKOn ERP dashboard untuk mengelola pesanan konveksi, pembayaran, pelanggan, dan data master.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  // Global auth guard — redirect to /login for any protected path
  beforeLoad: ({ location }) => {
    const pathname = location.pathname;
    // Public paths — skip auth check
    if (pathname === "/login" || pathname === "/forbidden") return;

    // Skip auth check on the server (SSR) because localStorage is not available.
    // The client will re-run this check during hydration or trigger 401 on API calls.
    if (typeof window === "undefined") return;

    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated()) {
      sessionStorage.setItem("sikon_session_expired", "1");
      throw redirect({ to: "/login" });
    }

    // Role-based access check
    if (user && !canAccess(user.role, pathname)) {
      throw redirect({ to: "/forbidden" });
    }
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Login & forbidden pages render without sidebar/header
  const isPublicRoute = pathname === "/login" || pathname === "/forbidden";

  function handleLogout() {
    // Mark this as a deliberate logout so in-flight API requests that return 401
    // don't mistakenly set the "session expired" flag for the login page toast.
    sessionStorage.setItem("sikon_intentional_logout", "1");
    logout();
    router.navigate({ to: "/login" });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {isPublicRoute ? (
          <>
            <Outlet />
            <Toaster richColors position="top-right" closeButton />
          </>
        ) : (
          <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <HeaderContent user={user} handleLogout={handleLogout} />
                <main className="flex-1 p-6">
                  <Outlet />
                </main>
              </div>
            </div>
            <Toaster richColors position="top-right" closeButton />
          </SidebarProvider>
        )}
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function HeaderContent({ user, handleLogout }: { user: any; handleLogout: () => void }) {
  const { t } = useLanguage();
  const roleBadge = user?.role ? ROLE_BADGE[user.role] : null;
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="h-14 flex items-center gap-3 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="flex-1" />

      {/* Language Switcher */}
      <LanguageSwitcher />

      {/* User info */}
      {user && (
        <div className="flex items-center gap-3 ml-1">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-foreground">{user.name}</span>
            {roleBadge && (
              <Badge
                variant="outline"
                className={`h-4 px-1.5 text-[10px] font-medium ${roleBadge.className}`}
              >
                {t(roleBadge.labelKey, roleBadge.defaultLabel)}
              </Badge>
            )}
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image_url} alt={user.name} />
            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <Button
            id="logout-btn"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title={t("action.logout")}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}

