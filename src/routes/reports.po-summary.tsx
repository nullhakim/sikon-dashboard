import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route untuk /reports/po-summary dan child-nya (/reports/po-summary/$poId).
 * Tidak ada UI wrapper — setiap child merender kontennya sendiri.
 */
export const Route = createFileRoute("/reports/po-summary")({
  component: () => <Outlet />,
});
