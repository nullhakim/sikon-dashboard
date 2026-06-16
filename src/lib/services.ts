// Service layer mapping Swagger endpoints to typed functions.
import { api, type ApiPaginated, type ApiSuccess } from "./api";
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
    return api.get<ApiPaginated<Order>>("/orders", q);
  },
  get: (id: string) => api.get<ApiSuccess<Order>>(`/orders/${id}`),
  create: (body: {
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
      qty: number;
      price: number;
      details?: Record<string, any>;
    }[];
  }) => api.post<ApiSuccess<unknown>>("/orders", body),
  update: (
    id: string,
    body: {
      customer_id: string;
      sales_id: string;
      shipping_cost?: number;
      courier_name?: string;
      shipping_address?: string;
      notes?: string;
      terms_conditions?: string;
      valid_until?: string;
      items: { product_id: string; qty: number; price: number; details?: Record<string, any> }[];
    },
  ) => api.put<ApiSuccess<unknown>>(`/orders/${id}`, body),
  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiSuccess<unknown>>(`/orders/${id}/status`, { order_status: status }),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/orders/${id}`),
  payments: (orderId: string) => api.get<ApiSuccess<Payment[]>>(`payments/order/${orderId}`),
  addItem: (orderId: string, body: { product_id: string; qty: number; price: number; details?: Record<string, any> }) =>
    api.post<ApiSuccess<unknown>>(`/orders/${orderId}/items`, body),
  updateItem: (orderId: string, itemId: string, body: { product_id: string; qty: number; price: number; details?: Record<string, any> }) =>
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
