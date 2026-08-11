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

// ─── Role badge styles ────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  owner: { label: "Owner", className: "bg-violet-100 text-violet-700 border-violet-200" },
  accounting: { label: "Accounting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  sales: { label: "Sales", className: "bg-green-100 text-green-700 border-green-200" },
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
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
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
          "SIKOn ERP dashboard for managing konveksi orders, payments, customers, and master data.",
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
    <html lang="en">
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
    logout();
    router.navigate({ to: "/login" });
  }

  const roleBadge = user?.role ? ROLE_BADGE[user.role] : null;
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  if (isPublicRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster richColors position="top-right" closeButton />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b bg-card/50 backdrop-blur px-4 sticky top-0 z-10">
              <SidebarTrigger />
              <div className="flex-1" />

              {/* User info */}
              {user && (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-xs font-semibold text-foreground">{user.name}</span>
                    {roleBadge && (
                      <Badge
                        variant="outline"
                        className={`h-4 px-1.5 text-[10px] font-medium ${roleBadge.className}`}
                      >
                        {roleBadge.label}
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
                    title="Logout"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" closeButton />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
