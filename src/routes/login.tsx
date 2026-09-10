import { useEffect, useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

import { authService } from "@/lib/services";
import { useAuthStore } from "@/lib/auth-store";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — SIKOn ERP" },
      { name: "description", content: "Masuk ke dashboard SIKOn ERP." },
    ],
  }),
  beforeLoad: () => {
    // If already authenticated, redirect to dashboard
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});
type FormValues = z.infer<typeof schema>;

// ─── Role Badge Colors ─────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  accounting: "Accounting",
  sales: "Sales",
};

// ─── Component ────────────────────────────────────────────────────────────────

function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Always clear the intentional logout marker set by handleLogout()
      const wasIntentional = sessionStorage.getItem("sikon_intentional_logout") === "1";
      sessionStorage.removeItem("sikon_intentional_logout");

      // Only show "session expired" toast if the logout was NOT triggered by the user
      const expired = sessionStorage.getItem("sikon_session_expired");
      if (expired && !wasIntentional) {
        sessionStorage.removeItem("sikon_session_expired");
        toast.error("Sesi Berakhir", {
          description: "Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.",
        });
      } else {
        sessionStorage.removeItem("sikon_session_expired");
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const res: any = await authService.login(values.email, values.password);
      
      // Handle various response formats from the backend
      const data = res.data || res;
      const token = data.token;
      let expires_at = data.expires_at;
      const user = data.user;

      if (!token || !user) {
        throw new Error(res.message || res.error || "Format response tidak valid dari server");
      }

      // Safely parse expires_at
      if (!expires_at) {
        expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else if (typeof expires_at === "number") {
        // Unix timestamp in seconds (if < 1e10)
        expires_at = new Date(expires_at < 1e10 ? expires_at * 1000 : expires_at).toISOString();
      } else {
        const d = new Date(expires_at);
        // If invalid date or the date is in the past (timezone mismatch), fallback to 24h
        if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
          expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        } else {
          expires_at = d.toISOString();
        }
      }

      login(token, expires_at, user);
      toast.success(`Selamat datang, ${user.name || "User"}! 👋`, {
        description: `Login sebagai ${ROLE_LABELS[user.role] ?? user.role}`,
      });
      await router.navigate({ to: "/" });
    } catch (err: any) {
      const serverMsg: string =
        err?.payload?.error ??
        err?.payload?.message ??
        err?.message ??
        "Terjadi kesalahan. Coba lagi.";

      const status = err?.status;

      if (status === 401) {
        // Case 1: Login gagal - email / password salah
        const message = "Email atau password yang Anda masukkan salah.";
        setError("email", { message: "" });
        setError("password", { message });
        toast.error("Login Gagal", { description: message });
      } else if (status === 403) {
        // Case 2: User dinonaktifkan / tidak aktif
        const message =
          serverMsg && serverMsg !== "Request failed (403)"
            ? serverMsg
            : "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.";
        toast.error("Akses Ditolak (403)", { description: message });
      } else {
        // Fallback for other errors
        toast.error("Login Gagal", { description: serverMsg });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50">
      {/* Subtle background gradient accents */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          animation: "pulse 10s ease-in-out infinite 2s",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl font-bold text-2xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
              S
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                SIKOn ERP
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Sistem Integrasi Konveksi Online
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="nama@perusahaan.com"
                {...register("email")}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {errors.email?.message && (
                <p className="text-xs text-rose-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password?.message && (
                <p className="text-xs text-rose-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
            >
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Masuk…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Masuk ke Dashboard
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} SIKOn ERP · Internal System
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
