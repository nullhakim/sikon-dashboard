/**
 * useAuth — Centralized role-aware auth hook.
 *
 * Reads the current user from the Zustand auth store and exposes
 * granular permission booleans so pages/components can conditionally
 * render UI without repeating role-comparison logic.
 *
 * Usage:
 *   const { isOwner, canManageCatalog, canVerifyPayment } = useAuth();
 */
import { useAuthStore } from "@/lib/auth-store";
import type { UserRole } from "@/lib/types/auth";

export interface AuthHelpers {
  user: ReturnType<typeof useAuthStore>["user"];
  role: UserRole | null;

  /** true only for 'owner' */
  isOwner: boolean;
  /** true only for 'accounting' */
  isAccounting: boolean;
  /** true only for 'sales' */
  isSales: boolean;

  /**
   * Products & Categories — write access.
   * Only 'owner' may Create / Edit / Delete catalog entries.
   */
  canManageCatalog: boolean;

  /**
   * Payments — verification access.
   * 'owner' and 'accounting' may Approve / Reject payments.
   */
  canVerifyPayment: boolean;

  /**
   * Customers — assign-to-sales access.
   * 'owner' and 'accounting' see the "Assign to Sales" field/filter.
   * 'sales' is auto-assigned by the backend.
   */
  canAssignSales: boolean;
}

export function useAuth(): AuthHelpers {
  const { user } = useAuthStore();
  const role = (user?.role ?? null) as UserRole | null;

  return {
    user,
    role,
    isOwner:          role === "owner",
    isAccounting:     role === "accounting",
    isSales:          role === "sales",
    canManageCatalog: role === "owner",
    canVerifyPayment: role === "owner" || role === "accounting",
    canAssignSales:   role === "owner" || role === "accounting",
  };
}
