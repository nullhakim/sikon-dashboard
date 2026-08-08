import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forbidden")({
  head: () => ({
    meta: [
      { title: "403 Forbidden — SIKOn ERP" },
      { name: "description", content: "Anda tidak memiliki izin untuk mengakses halaman ini." },
    ],
  }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="h-10 w-10" />
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl font-bold text-foreground">403</h1>
        <h2 className="text-xl font-semibold text-foreground">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator
          jika Anda merasa ini adalah kesalahan.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
