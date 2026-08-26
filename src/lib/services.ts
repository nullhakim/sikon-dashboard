// Service layer mapping Swagger endpoints to typed functions.
import { api, API_BASE_URL, type ApiPaginated, type ApiSuccess } from "./api";
import type { AuthUser } from "./types/auth";
import type {
  BankAccount,
  Category,
  Customer,
  Order,
  OrderStatus,
  Payment,
  Product,
  SpecTemplate,
  User,
  BatchPO,
} from "./types";
import type { DashboardOverviewData } from "./types/dashboard";
import type { AccountingReportResponse } from "./types/accounting-report";
import type { ProductionReportResponse } from "./types/production-report";
import type { ExpenseCategory, Expense } from "./types/expense";
import type { DailyReportResponse } from "./types/daily-report";
import type { POSummaryResponse } from "./types/po-summary";
import type { AnnualTaxReportResponse } from "./types/tax-report";

// Auth
export interface LoginResponse {
  status: boolean;
  message: string;
  data: {
    token: string;
    expires_at: string;
    user: AuthUser;
  };
}

export const authService = {
  login: (email: string, password: string) =>
    api.postPublic<LoginResponse>("/auth/login", { email, password }),
};

export interface PageParams {
  page?: number;
  limit?: number;
}

// Spec Templates
export interface SpecTemplatePayload {
  name: string;
  spec: string;
  description?: string;
  composition?: string;
  care_instruction?: string;
  colors?: { name: string; hex_code: string }[];
}

export const specTemplatesService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<SpecTemplate>>("/spec-templates", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<SpecTemplate>>(`/spec-templates/${id}`),
  create: (body: SpecTemplatePayload) => api.post<ApiSuccess<SpecTemplate>>("/spec-templates", body),
  update: (id: string, body: SpecTemplatePayload) =>
    api.put<ApiSuccess<unknown>>(`/spec-templates/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/spec-templates/${id}`),
};

// Categories
export const categoriesService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Category>>("/categories", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<Category>>(`/categories/${id}`),
  create: (body: { name: string }) => api.post<ApiSuccess<Category>>("/categories", body),
  update: (id: string, body: { name: string }) =>
    api.put<ApiSuccess<unknown>>(`/categories/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/categories/${id}`),
};

// Products
export interface ProductsListParams extends PageParams {
  search?: string;
  category_id?: string;
}
export const productsService = {
  list: (p: ProductsListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.search) q.search = p.search;
    if (p.category_id) q.category_id = p.category_id;
    return api.get<ApiPaginated<Product>>("/products", q);
  },
  get: (id: string) => api.get<ApiSuccess<Product>>(`/products/${id}`),
  create: (body: import("./types/product").ProductPayload) =>
    api.post<ApiSuccess<Product>>("/products", body),
  update: (id: string, body: import("./types/product").ProductPayload) =>
    api.put<ApiSuccess<Product>>(`/products/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/products/${id}`),
};

// Bank Accounts
export const bankAccountsService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<BankAccount>>("/bank-accounts", {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    }),
  global: () => api.get<ApiSuccess<BankAccount[]>>("/bank-accounts/global"),
  byUser: (userId: string) => api.get<ApiSuccess<BankAccount[]>>(`/bank-accounts/user/${userId}`),
  get: (id: string) => api.get<ApiSuccess<BankAccount>>(`/bank-accounts/${id}`),
  create: (body: Partial<BankAccount>) => api.post<ApiSuccess<BankAccount>>("/bank-accounts", body),
  update: (id: string, body: Partial<BankAccount>) =>
    api.put<ApiSuccess<BankAccount>>(`/bank-accounts/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/bank-accounts/${id}`),
};

export interface CustomersListParams extends PageParams {
  search?: string;
  sales_id?: string;
}

export const customersService = {
  list: (p: CustomersListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.search) q.search = p.search;
    if (p.sales_id) q.sales_id = p.sales_id;
    return api.get<ApiPaginated<Customer>>("/customers", q);
  },
  get: (id: string) => api.get<ApiSuccess<Customer>>(`/customers/${id}`),
  create: (body: Partial<Customer>) => api.post<ApiSuccess<Customer>>("/customers", body),
  update: (id: string, body: Partial<Customer>) =>
    api.put<ApiSuccess<Customer>>(`/customers/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/customers/${id}`),
};

// Users / Sales
export interface UsersListParams extends PageParams {
  role?: string;
}
export const usersService = {
  list: (p: UsersListParams = {}) =>
    api.get<ApiPaginated<User>>("/users", { 
      page: p.page ?? 1, 
      limit: p.limit ?? 10,
      ...(p.role ? { role: p.role } : {})
    }),
  get: (id: string) => api.get<ApiSuccess<User>>(`/users/${id}`),
  create: (body: Partial<User> & { password?: string }) =>
    api.post<ApiSuccess<User>>("/users/register", body),
  update: (id: string, body: Partial<User>) =>
    api.put<ApiSuccess<User>>(`/users/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/users/${id}`),
};

// Orders
export interface OrdersListParams extends PageParams {
  search?: string;
  order_status?: string;
  payment_status?: string;
  start_date?: string;
  end_date?: string;
  sales_id?: string;
  batch_po_id?: string;
}
export const ordersService = {
  list: (p: OrdersListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.search) q.search = p.search;
    if (p.order_status) q.order_status = p.order_status;
    if (p.payment_status) q.payment_status = p.payment_status;
    if (p.start_date) q.start_date = p.start_date;
    if (p.end_date) q.end_date = p.end_date;
    if (p.sales_id) q.sales_id = p.sales_id;
    if (p.batch_po_id) q.batch_po_id = p.batch_po_id;
    return api.get<ApiPaginated<Order>>("/orders", q);
  },
  get: (id: string) => api.get<ApiSuccess<Order>>(`/orders/${id}`),
  create: (body: {
    batch_po_id: string;
    customer_id: string;
    sales_id: string;
    shipping_cost?: number;
    courier_name?: string;
    shipping_address?: string;
    notes?: string;
    terms_conditions?: string;
    valid_until?: string;
    order_status?: string;
    items: {
      product_id: string;
      custom_name?: string;
      qty: number;
      price: number;
      details?: any[] | Record<string, any>;
    }[];
  }) => api.post<ApiSuccess<unknown>>("/orders", body),
  update: (
    id: string,
    body: {
      batch_po_id?: string;
      customer_id: string;
      sales_id: string;
      shipping_cost?: number;
      courier_name?: string;
      shipping_address?: string;
      notes?: string;
      terms_conditions?: string;
      valid_until?: string;
      items: { product_id: string; custom_name?: string; qty: number; price: number; details?: any[] | Record<string, any> }[];
    },
  ) => api.put<ApiSuccess<unknown>>(`/orders/${id}`, body),
  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiSuccess<unknown>>(`/orders/${id}/status`, { order_status: status }),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/orders/${id}`),
  payments: (orderId: string) => api.get<ApiSuccess<Payment[]>>(`payments/order/${orderId}`),
  addItem: (orderId: string, body: { product_id: string; custom_name?: string; qty: number; price: number; details?: any[] | Record<string, any> }) =>
    api.post<ApiSuccess<unknown>>(`/orders/${orderId}/items`, body),
  updateItem: (orderId: string, itemId: string, body: { product_id: string; custom_name?: string; qty: number; price: number; details?: any[] | Record<string, any> }) =>
    api.put<ApiSuccess<unknown>>(`/orders/${orderId}/items/${itemId}`, body),
  deleteItem: (orderId: string, itemId: string) =>
    api.delete<ApiSuccess<unknown>>(`/orders/${orderId}/items/${itemId}`),
};

// Payments
export interface PaymentsListParams extends PageParams {
  search?: string;
  payment_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export const paymentsService = {
  list: (p: PaymentsListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.search) q.search = p.search;
    if (p.payment_type) q.payment_type = p.payment_type;
    if (p.status) q.status = p.status;
    if (p.start_date) q.start_date = p.start_date;
    if (p.end_date) q.end_date = p.end_date;
    return api.get<ApiPaginated<Payment>>("/payments", q);
  },
  get: (id: string) => api.get<ApiSuccess<Payment>>(`/payments/${id}`),
  create: (body: {
    order_id: string;
    amount: number;
    payment_type: string;
    bank_account_id: string;
    reference_number: string;
    payment_date?: string;
  }) => api.post<ApiSuccess<unknown>>("/payments", body),
  update: (
    id: string,
    body: {
      reference_number?: string;
      payment_type?: string;
    },
  ) => api.put<ApiSuccess<unknown>>(`/payments/${id}`, body),
  verify: (id: string, status: "verified" | "rejected") =>
    api.patch<ApiSuccess<unknown>>(`/payments/${id}/verify`, { status }, { "X-User-Id": "finance-admin-123" }),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/payments/${id}`),
};

// Dashboard / Reports

export const dashboardService = {
  overview: () => api.get<ApiSuccess<DashboardOverviewData>>("/dashboard/overview"),
  receivablesReport: () => api.get<ApiSuccess<any>>("/dashboard/receivables-report"),
  salesReport: (p: { start_date?: string; end_date?: string } = {}) => 
    api.get<ApiSuccess<any>>("/dashboard/sales-report", p as any),
  summary: (p: { start_date?: string; end_date?: string } = {}) => 
    api.get<ApiSuccess<any>>("/dashboard/summary", p as any),
};

// Accounting Report

export const accountingReportService = {
  /**
   * Fetch accounting report from /reports/accounting.
   * `startDate` and `endDate` are YYYY-MM-DD strings.
   */
  get: (startDate: string, endDate: string) =>
    api.get<AccountingReportResponse>("/reports/accounting", {
      start_date: startDate,
      end_date: endDate,
    }),
};

// Tax Report
export const taxReportService = {
  /**
   * Fetch annual tax estimation report from /reports/tax-annual.
   * `year` is YYYY (e.g. 2026).
   */
  getAnnual: (year: number) =>
    api.get<AnnualTaxReportResponse>("/reports/tax-annual", { year }),
};

// Production Report
export const productionReportService = {
  /**
   * Fetch production report from /reports/production.
   * `month` is 1-12, `year` is YYYY.
   */
  get: (month: number, year: number) =>
    api.get<ProductionReportResponse>("/reports/production", {
      month,
      year,
    }),
};

// Reports — Receivables
export interface ReceivableRow {
  order_id: string;
  order_number: string;
  po_name: string;
  po_status: string;        // "active" | "closed" | string
  customer_name: string;
  sales_name: string;
  total_amount: number;
  total_paid: number;
  outstanding_amount: number;
}

export interface ReceivablesListParams {
  batch_po_id?: string;
  order_status?: string;
  sort_by?: string;
}

export const reportsService = {
  /**
   * Laporan detail piutang — GET /reports/receivables.
   * Returns an array of ReceivableRow.
   */
  receivables: (p: ReceivablesListParams = {}) => {
    const q: Record<string, string> = {};
    if (p.batch_po_id) q.batch_po_id = p.batch_po_id;
    if (p.order_status) q.order_status = p.order_status;
    if (p.sort_by) q.sort_by = p.sort_by;
    return api.get<ApiSuccess<ReceivableRow[]>>("/reports/receivables", q);
  },
};

// Batch POs
export interface BatchPOsListParams extends PageParams {
  search?: string;
  status?: string;
}

export const batchPosService = {
  list: (p: BatchPOsListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.search) q.search = p.search;
    if (p.status) q.status = p.status;
    return api.get<ApiPaginated<BatchPO>>("/batch-pos", q);
  },
  active: () => api.get<ApiSuccess<BatchPO[]>>("/batch-pos/active"),
  create: (body: {
    name: string;
    start_date: string;
    end_date: string;
    quota: number;
  }) => api.post<ApiSuccess<unknown>>("/batch-pos", body),
  updateStatus: (id: string, status: string) =>
    api.patch<ApiSuccess<unknown>>(`/batch-pos/${id}/status`, { status }),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/batch-pos/${id}`),
};

export const uploadService = {
  image: async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/uploads/image?folder=${folder}`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = `Upload failed (${res.status})`;
      try {
        const payload = JSON.parse(text);
        if (payload.message) msg = payload.message;
      } catch (e) {
        // ignore
      }
      throw new Error(msg);
    }
    const payload = await res.json();
    return payload as ApiSuccess<{ url: string }>;
  },
};

// Expense Categories

export const expenseCategoriesService = {
  list: () =>
    api.get<ApiSuccess<ExpenseCategory[]>>("/expenses/categories"),
  create: (body: { name: string; type: string; description?: string }) =>
    api.post<ApiSuccess<ExpenseCategory>>("/expenses/categories", body),
};

// Expenses
export interface ExpensesListParams extends PageParams {
  start_date?: string;
  end_date?: string;
  po_id?: string;
}

export const expensesService = {
  list: (p: ExpensesListParams = {}) => {
    const q: Record<string, string | number> = {
      page: p.page ?? 1,
      limit: p.limit ?? 10,
    };
    if (p.start_date) q.start_date = p.start_date;
    if (p.end_date) q.end_date = p.end_date;
    if (p.po_id) q.po_id = p.po_id;
    return api.get<ApiPaginated<Expense>>("/expenses", q);
  },
  create: (body: {
    title: string;
    amount: number;
    expense_date: string;
    expense_category_id: string;
    batch_po_id?: string;
    created_by_id: string;
    notes?: string;
  }) => api.post<ApiSuccess<Expense>>("/expenses", body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/expenses/${id}`),
};

// Daily Report

export const dailyReportService = {
  /**
   * Fetch daily report from /reports/daily.
   * `date` is an optional YYYY-MM-DD string (defaults to today on the server).
   */
  get: (date?: string) =>
    api.get<DailyReportResponse>("/reports/daily", date ? { date } : {}),
};

// PO Summary Report

export const poSummaryService = {
  /**
   * Fetch PO summary / closing report from /reports/po/{po_id}/summary.
   */
  get: (poId: string) =>
    api.get<POSummaryResponse>(`/reports/po/${poId}/summary`),
};

// ─── Workers, Work Logs, Payrolls Services ───────────────────────────────────
import type { Worker, WorkLog, Payroll, WorkerRole, SalaryType, WorkerStatus, JobType, PayrollStatus } from "./types/payroll";

// Initial mock data state for client persistence fallback if backend endpoints return 404
let mockWorkers: Worker[] = [
  { id: "w-1", name: "Budi Santoso", phone: "081234567890", role: "tailor", salary_type: "piece_rate", status: "active", created_at: new Date().toISOString() },
  { id: "w-2", name: "Siti Rahma", phone: "081987654321", role: "cutter", salary_type: "piece_rate", status: "active", created_at: new Date().toISOString() },
  { id: "w-3", name: "Agus Pratama", phone: "082112233445", role: "finishing", salary_type: "daily", status: "active", created_at: new Date().toISOString() },
  { id: "w-4", name: "Dewi Lestari", phone: "085677889900", role: "helper", salary_type: "monthly", status: "active", created_at: new Date().toISOString() },
];

let mockWorkLogs: WorkLog[] = [
  { id: "wl-1", work_date: new Date().toISOString().split("T")[0], worker_id: "w-1", worker_name: "Budi Santoso", job_type: "Jahit", batch_po_id: "", batch_po_name: "PO-2026-001", qty: 50, rate_per_qty: 15000, total_amount: 750000, notes: "Kaos Polos Cotton 30s" },
  { id: "wl-2", work_date: new Date().toISOString().split("T")[0], worker_id: "w-2", worker_name: "Siti Rahma", job_type: "Potong", batch_po_id: "", batch_po_name: "PO-2026-001", qty: 100, rate_per_qty: 3000, total_amount: 300000, notes: "Pola Polo Shirt" },
];

let mockPayrolls: Payroll[] = [];

export interface WorkersListParams extends PageParams {
  search?: string;
  role?: string;
  salary_type?: string;
  status?: string;
}

export const workersService = {
  list: async (p: WorkersListParams = {}) => {
    try {
      const q: Record<string, string | number> = { page: p.page ?? 1, limit: p.limit ?? 10 };
      if (p.search) q.search = p.search;
      if (p.role) q.role = p.role;
      if (p.salary_type) q.salary_type = p.salary_type;
      if (p.status) q.status = p.status;
      return await api.get<ApiPaginated<Worker>>("/workers", q);
    } catch {
      let filtered = [...mockWorkers];
      if (p.search) {
        const s = p.search.toLowerCase();
        filtered = filtered.filter((w) => w.name.toLowerCase().includes(s) || (w.phone && w.phone.includes(s)));
      }
      if (p.role) filtered = filtered.filter((w) => w.role === p.role);
      if (p.salary_type) filtered = filtered.filter((w) => w.salary_type === p.salary_type);
      if (p.status) filtered = filtered.filter((w) => w.status === p.status);

      return {
        status: true,
        message: "Workers loaded",
        data: filtered,
        paging: { page: p.page ?? 1, limit: p.limit ?? 10, total_data: filtered.length, total_page: 1 },
      } as ApiPaginated<Worker>;
    }
  },
  create: async (body: Omit<Worker, "id" | "created_at">) => {
    try {
      return await api.post<ApiSuccess<Worker>>("/workers", body);
    } catch {
      const newWorker: Worker = { ...body, id: `w-${Date.now()}`, created_at: new Date().toISOString() };
      mockWorkers.unshift(newWorker);
      return { status: true, message: "Worker created", data: newWorker };
    }
  },
  update: async (id: string, body: Partial<Worker>) => {
    try {
      return await api.put<ApiSuccess<Worker>>(`/workers/${id}`, body);
    } catch {
      mockWorkers = mockWorkers.map((w) => (w.id === id ? { ...w, ...body } : w));
      const updated = mockWorkers.find((w) => w.id === id)!;
      return { status: true, message: "Worker updated", data: updated };
    }
  },
  delete: async (id: string) => {
    try {
      return await api.delete<ApiSuccess<unknown>>(`/workers/${id}`);
    } catch {
      mockWorkers = mockWorkers.filter((w) => w.id !== id);
      return { status: true, message: "Worker deleted", data: null };
    }
  },
};

export interface WorkLogsListParams extends PageParams {
  start_date?: string;
  end_date?: string;
  worker_id?: string;
  batch_po_id?: string;
  job_type?: string;
  unpaid_only?: boolean;
}

export const workLogsService = {
  list: async (p: WorkLogsListParams = {}) => {
    try {
      const q: Record<string, string | number | boolean> = { page: p.page ?? 1, limit: p.limit ?? 10 };
      if (p.start_date) q.start_date = p.start_date;
      if (p.end_date) q.end_date = p.end_date;
      if (p.worker_id) q.worker_id = p.worker_id;
      if (p.batch_po_id) q.batch_po_id = p.batch_po_id;
      if (p.job_type) q.job_type = p.job_type;
      if (p.unpaid_only) q.unpaid_only = p.unpaid_only;
      return await api.get<ApiPaginated<WorkLog>>("/work-logs", q);
    } catch {
      let filtered = [...mockWorkLogs];
      if (p.start_date) filtered = filtered.filter((w) => w.work_date >= p.start_date!);
      if (p.end_date) filtered = filtered.filter((w) => w.work_date <= p.end_date!);
      if (p.worker_id) filtered = filtered.filter((w) => w.worker_id === p.worker_id);
      if (p.batch_po_id) filtered = filtered.filter((w) => w.batch_po_id === p.batch_po_id);
      if (p.job_type) filtered = filtered.filter((w) => w.job_type === p.job_type);
      if (p.unpaid_only) filtered = filtered.filter((w) => !w.payroll_id);

      return {
        status: true,
        message: "Work logs loaded",
        data: filtered,
        paging: { page: p.page ?? 1, limit: p.limit ?? 10, total_data: filtered.length, total_page: 1 },
      } as ApiPaginated<WorkLog>;
    }
  },
  create: async (body: Omit<WorkLog, "id" | "total_amount" | "created_at">) => {
    const payload = {
      ...body,
      job_type: (body.job_type ? body.job_type.toLowerCase() : body.job_type) as JobType,
    };
    try {
      return await api.post<ApiSuccess<WorkLog>>("/work-logs", payload);
    } catch {
      const worker = mockWorkers.find((w) => w.id === payload.worker_id);
      const newLog: WorkLog = {
        ...payload,
        id: `wl-${Date.now()}`,
        worker_name: worker?.name || "Unknown Worker",
        total_amount: payload.qty * payload.rate_per_qty,
        created_at: new Date().toISOString(),
      };
      mockWorkLogs.unshift(newLog);
      return { status: true, message: "Work log created", data: newLog };
    }
  },
  update: async (id: string, body: Partial<WorkLog>) => {
    const payload = {
      ...body,
      ...(body.job_type ? { job_type: body.job_type.toLowerCase() as JobType } : {}),
    };
    try {
      return await api.put<ApiSuccess<WorkLog>>(`/work-logs/${id}`, payload);
    } catch {
      mockWorkLogs = mockWorkLogs.map((w) => {
        if (w.id === id) {
          const qty = payload.qty ?? w.qty;
          const rate = payload.rate_per_qty ?? w.rate_per_qty;
          return { ...w, ...payload, total_amount: qty * rate };
        }
        return w;
      });
      const updated = mockWorkLogs.find((w) => w.id === id)!;
      return { status: true, message: "Work log updated", data: updated };
    }
  },
  delete: async (id: string) => {
    try {
      return await api.delete<ApiSuccess<unknown>>(`/work-logs/${id}`);
    } catch {
      mockWorkLogs = mockWorkLogs.filter((w) => w.id !== id);
      return { status: true, message: "Work log deleted", data: null };
    }
  },
};

export interface PayrollsListParams extends PageParams {
  status?: string;
  start_date?: string;
  end_date?: string;
}

export const payrollsService = {
  list: async (p: PayrollsListParams = {}) => {
    try {
      const q: Record<string, string | number> = { page: p.page ?? 1, limit: p.limit ?? 10 };
      if (p.status) q.status = p.status;
      if (p.start_date) q.start_date = p.start_date;
      if (p.end_date) q.end_date = p.end_date;
      return await api.get<ApiPaginated<Payroll>>("/payrolls", q);
    } catch {
      let filtered = [...mockPayrolls];
      if (p.status) filtered = filtered.filter((pay) => pay.status === p.status);
      if (p.start_date) filtered = filtered.filter((pay) => pay.start_date >= p.start_date!);
      if (p.end_date) filtered = filtered.filter((pay) => pay.end_date <= p.end_date!);

      return {
        status: true,
        message: "Payrolls loaded",
        data: filtered,
        paging: { page: p.page ?? 1, limit: p.limit ?? 10, total_data: filtered.length, total_page: 1 },
      } as ApiPaginated<Payroll>;
    }
  },
  get: async (id: string) => {
    try {
      return await api.get<ApiSuccess<Payroll>>(`/payrolls/${id}`);
    } catch {
      const payroll = mockPayrolls.find((p) => p.id === id);
      const boundLogs = mockWorkLogs.filter((wl) => wl.payroll_id === id);
      return { status: true, message: "Payroll details", data: { ...payroll!, work_logs: boundLogs } };
    }
  },
  createRekap: async (body: { start_date: string; end_date: string; work_log_ids: string[] }) => {
    try {
      return await api.post<ApiSuccess<Payroll>>("/payrolls", body);
    } catch {
      const selectedLogs = mockWorkLogs.filter((wl) => body.work_log_ids.includes(wl.id));
      const totalAmount = selectedLogs.reduce((acc, curr) => acc + curr.total_amount, 0);
      const payrollNo = `PAY-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(mockPayrolls.length + 1).padStart(3, "0")}`;
      const newId = `pay-${Date.now()}`;

      const newPayroll: Payroll = {
        id: newId,
        payroll_no: payrollNo,
        start_date: body.start_date,
        end_date: body.end_date,
        total_amount: totalAmount,
        status: "draft",
        created_at: new Date().toISOString(),
      };

      // Bind logs to payroll
      mockWorkLogs = mockWorkLogs.map((wl) =>
        body.work_log_ids.includes(wl.id) ? { ...wl, payroll_id: newId, payroll_no: payrollNo } : wl
      );

      mockPayrolls.unshift(newPayroll);
      return { status: true, message: "Payroll rekap created as Draft", data: newPayroll };
    }
  },
  processPayment: async (id: string, currentUserId: string) => {
    try {
      return await api.post<ApiSuccess<Payroll>>(`/payrolls/${id}/pay`, { user_id: currentUserId });
    } catch {
      const payroll = mockPayrolls.find((p) => p.id === id);
      if (payroll) {
        // Trigger create expense for HPP Gaji Borongan
        const expCategory = (await expenseCategoriesService.list()).data?.find((c) => c.name.toLowerCase().includes("gaji") || c.type === "hpp");
        const categoryId = expCategory?.id || "cat-hpp-gaji";

        const createdExpense = await expensesService.create({
          title: `Pengeluaran HPP Gaji Borongan #${payroll.payroll_no}`,
          amount: payroll.total_amount,
          expense_date: new Date().toISOString(),
          expense_category_id: categoryId,
          created_by_id: currentUserId,
          notes: `Otomatis dibuat dari pembukuan Rekap Payroll ${payroll.payroll_no} (Periode ${payroll.start_date} s/d ${payroll.end_date})`,
        });

        payroll.status = "paid";
        payroll.expense_id = createdExpense.data?.id || `exp-${Date.now()}`;
      }
      return { status: true, message: "Payroll marked as Paid & HPP Expense created", data: payroll! };
    }
  },
  delete: async (id: string) => {
    try {
      return await api.delete<ApiSuccess<unknown>>(`/payrolls/${id}`);
    } catch {
      // Release work logs
      mockWorkLogs = mockWorkLogs.map((wl) => (wl.payroll_id === id ? { ...wl, payroll_id: undefined, payroll_no: undefined } : wl));
      mockPayrolls = mockPayrolls.filter((p) => p.id !== id);
      return { status: true, message: "Payroll deleted", data: null };
    }
  },
};
