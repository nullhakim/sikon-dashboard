// Centralized API client for SIKOn backend.
// Base URL is configurable via VITE_API_BASE_URL.

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://dev-api-sikon.faridlan.com/api";

export interface ApiSuccess<T> {
  status?: string;
  message?: string;
  data: T;
}

export interface ApiPaginated<T> {
  status?: string;
  message?: string;
  data: T[];
  paging?: {
    page: number;
    limit: number;
    total_item: number;
    total_page: number;
  };
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`));
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    query?: Query;
    body?: unknown;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  } = {},
): Promise<T> {
  // Guard: never make API calls during SSR — no auth token is available on the server,
  // and outbound fetch failures cause h3 to swallow the error as HTTPError 500.
  if (typeof window === "undefined") {
    throw new Error(`SSR: apiRequest called on server for ${path}. Use 'enabled: typeof window !== "undefined"' in useQuery to prevent this.`);
  }

  const { method = "GET", query, body, headers, skipAuth = false } = opts;

  // Auto-inject Authorization header from auth store
  const authHeaders: Record<string, string> = {};
  if (!skipAuth) {
    // Import lazily to avoid circular dependencies
    const { getAuthState } = await import("@/lib/auth-store");
    const { token } = getAuthState();
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — auto logout and redirect to login
  if (res.status === 401) {
    console.warn("API returned 401 Unauthorized. Logging out...", { path, res });
    const { getAuthState } = await import("@/lib/auth-store");
    getAuthState().logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Sesi berakhir. Silakan login kembali.", 401, null);
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const msg =
      (payload as { message?: string } | null)?.message ?? `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Query, headers?: Record<string, string>) => apiRequest<T>(path, { query, headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => apiRequest<T>(path, { method: "POST", body, headers }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) => apiRequest<T>(path, { method: "PUT", body, headers }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) => apiRequest<T>(path, { method: "PATCH", body, headers }),
  delete: <T>(path: string, headers?: Record<string, string>) => apiRequest<T>(path, { method: "DELETE", headers }),
  /** Same as above but skips auth header injection (for login endpoint). */
  postPublic: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body, skipAuth: true }),
};
