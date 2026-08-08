// Zustand auth store with localStorage persistence.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, AuthUser } from "./types/auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expires_at: null,
      user: null,

      login: (token: string, expires_at: string, user: AuthUser) =>
        set({ token, expires_at, user }),

      logout: () => set({ token: null, expires_at: null, user: null }),

      isAuthenticated: () => {
        const { token, expires_at } = get();
        if (!token) return false;
        if (expires_at && new Date(expires_at) < new Date()) {
          // Token expired — clear state
          set({ token: null, expires_at: null, user: null });
          return false;
        }
        return true;
      },
    }),
    {
      name: "sikon-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields (not the functions)
      partialize: (state) => ({
        token: state.token,
        expires_at: state.expires_at,
        user: state.user,
      }),
    },
  ),
);

/** Read the raw store state outside React components (e.g. in api.ts). */
export const getAuthState = () => useAuthStore.getState();
