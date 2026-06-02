export function formatIDR(value: number | undefined | null): string {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

// ISO 8601 UTC like 2023-10-02T10:00:00Z
export function formatDateISO(value: string | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

// Convert ISO UTC string to <input type="datetime-local"> value (local TZ).
export function isoToDatetimeLocal(value: string | undefined | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convert a <input type="datetime-local"> value (YYYY-MM-DDTHH:mm) to
// ISO UTC string (YYYY-MM-DDTHH:mm:ssZ). Returns undefined for empty input.
export function datetimeLocalToISO(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
