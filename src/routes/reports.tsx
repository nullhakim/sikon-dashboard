import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Layout route untuk /reports dan semua child-nya (/reports/daily, dst.)
 * Tidak ada UI wrapper di sini — setiap child merender kontennya sendiri.
 */
export const Route = createFileRoute("/reports")({
  component: () => <Outlet />,
});
