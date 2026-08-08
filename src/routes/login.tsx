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
      const expires_at = data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const user = data.user;

      if (!token || !user) {
        throw new Error(res.message || res.error || "Format response tidak valid dari server");
      }

      login(token, expires_at, user);
      toast.success(`Selamat datang, ${user.name || "User"}! 👋`, {
        description: `Login sebagai ${ROLE_LABELS[user.role] ?? user.role}`,
      });
      await router.navigate({ to: "/" });
    } catch (err: any) {
      const msg: string = err?.message ?? "Terjadi kesalahan. Coba lagi.";
      if (
        msg.toLowerCase().includes("password") ||
        msg.toLowerCase().includes("email") ||
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("salah") ||
        msg.toLowerCase().includes("tidak valid") ||
        err?.status === 400 ||
        err?.status === 401
      ) {
        setError("email", { message: "" });
        setError("password", { message: "Email atau password tidak valid" });
      }
      toast.error("Login gagal", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Animated background blobs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle at center, hsl(250 84% 60%) 0%, transparent 70%)",
          animation: "pulse 8s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle at center, hsl(220 84% 55%) 0%, transparent 70%)",
          animation: "pulse 10s ease-in-out infinite 2s",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle at center, hsl(280 70% 65%) 0%, transparent 70%)",
          animation: "pulse 12s ease-in-out infinite 4s",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        <div
          className="rounded-2xl border border-white/10 p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl font-bold text-2xl text-white shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, hsl(250 84% 60%), hsl(220 84% 55%))",
                boxShadow: "0 0 32px hsla(250, 84%, 60%, 0.4)",
              }}
            >
              S
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                SIKOn ERP
              </h1>
              <p className="mt-1 text-sm text-white/50">
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
                className="block text-sm font-medium text-white/70"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20"
              />
              {errors.email?.message && (
                <p className="text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-white/70"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password?.message && (
                <p className="text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="group relative w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-violet-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background:
                  "linear-gradient(135deg, hsl(250 84% 58%), hsl(220 84% 53%))",
                boxShadow: "0 4px 20px hsla(250, 84%, 60%, 0.35)",
              }}
            >
              {/* Shine effect */}
              <span className="absolute inset-0 translate-x-[-100%] skew-x-[-20deg] bg-white/10 transition-transform duration-700 group-hover:translate-x-[120%]" />
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
          <p className="mt-6 text-center text-xs text-white/25">
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
