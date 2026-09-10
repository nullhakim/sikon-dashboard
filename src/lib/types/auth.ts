// Auth types for SIKOn JWT Authentication & RBAC

export type UserRole = "owner" | "accounting" | "sales";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image_url?: string;
  phone?: string;
  status_text?: string;
}

export interface AuthState {
  token: string | null;
  expires_at: string | null;
  user: AuthUser | null;
  login: (token: string, expires_at: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

/**
 * Defines which roles are allowed to access each route prefix.
 * Routes not listed here are accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/users": ["owner"],
  "/expenses": ["owner", "accounting"],
  "/expense-categories": ["owner", "accounting"],
  "/reports": ["owner", "accounting"],
  "/receivables": ["owner", "accounting"],
  "/payments": ["owner", "accounting"],
  "/batch-pos": ["owner", "accounting"],
  "/bank-accounts": ["owner", "accounting"],
  "/material-catalogs": ["owner", "accounting"],
  "/materials": ["owner", "accounting"],
};

/** Check whether a role can access a given path prefix. */
export function canAccess(role: string | undefined, path: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as UserRole;
  const matchedKey = Object.keys(ROUTE_PERMISSIONS).find((prefix) =>
    path === prefix || path.startsWith(prefix + "/"),
  );
  if (!matchedKey) return true; // no restriction → allow
  return ROUTE_PERMISSIONS[matchedKey].includes(normalizedRole);
}
