// Service layer mapping Swagger endpoints to typed functions.
import { api, API_BASE_URL, type ApiPaginated, type ApiSuccess } from "./api";
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

export interface PageParams {
  page?: number;
  limit?: number;
}

// Spec Templates
export const specTemplatesService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<SpecTemplate>>("/spec-templates", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<SpecTemplate>>(`/spec-templates/${id}`),
  create: (body: { name: string; spec: string }) => api.post<ApiSuccess<SpecTemplate>>("/spec-templates", body),
  update: (id: string, body: { name: string; spec: string }) =>
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
  create: (body: Partial<Product>) => api.post<ApiSuccess<Product>>("/products", body),
  update: (id: string, body: Partial<Product>) =>
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
  update: (id: string, body: { name?: string; role?: string }) =>
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
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/payments/${id}`),
};

// Dashboard / Reports
export const dashboardService = {
  receivablesReport: () => api.get<ApiSuccess<any>>("/dashboard/receivables-report"),
  salesReport: (p: { start_date?: string; end_date?: string } = {}) => 
    api.get<ApiSuccess<any>>("/dashboard/sales-report", p as any),
  summary: (p: { start_date?: string; end_date?: string } = {}) => 
    api.get<ApiSuccess<any>>("/dashboard/summary", p as any),
};

// Accounting Report
import type { AccountingReportResponse } from "./types/accounting-report";
import type { ProductionReportResponse } from "./types/production-report";

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

export const reportsService = {
  /**
   * Laporan detail piutang — GET /reports/receivables.
   * Returns an array of ReceivableRow sorted by outstanding_amount DESC on the server.
   */
  receivables: () => api.get<ApiSuccess<ReceivableRow[]>>("/reports/receivables"),
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
