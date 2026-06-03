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
  User,
} from "./types";

export interface PageParams {
  page?: number;
  limit?: number;
}

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
export const productsService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Product>>("/products", { page: p.page ?? 1, limit: p.limit ?? 10 }),
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
  byUser: (userId: string) =>
    api.get<ApiSuccess<BankAccount[]>>(`/bank-accounts/user/${userId}`),
  get: (id: string) => api.get<ApiSuccess<BankAccount>>(`/bank-accounts/${id}`),
  create: (body: Partial<BankAccount>) =>
    api.post<ApiSuccess<BankAccount>>("/bank-accounts", body),
  update: (id: string, body: Partial<BankAccount>) =>
    api.put<ApiSuccess<BankAccount>>(`/bank-accounts/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/bank-accounts/${id}`),
};

// Customers
export const customersService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Customer>>("/customers", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<Customer>>(`/customers/${id}`),
  create: (body: Partial<Customer>) => api.post<ApiSuccess<Customer>>("/customers", body),
  update: (id: string, body: Partial<Customer>) =>
    api.put<ApiSuccess<Customer>>(`/customers/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/customers/${id}`),
};

// Users / Sales
export const usersService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<User>>("/users", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<User>>(`/users/${id}`),
  create: (body: Partial<User> & { password?: string }) =>
    api.post<ApiSuccess<User>>("/users/register", body),
  update: (id: string, body: { name?: string; role?: string }) =>
    api.put<ApiSuccess<User>>(`/users/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/users/${id}`),
};

// Orders
export const ordersService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Order>>("/orders", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<Order>>(`/orders/${id}`),
  create: (body: {
    customer_id: string;
    sales_id: string;
    shipping_cost?: number;
    courier_name?: string;
    shipping_address?: string;
    notes?: string;
    valid_until?: string;
    terms_conditions?: string;
    order_status?: string;
    items: { product_id: string; qty: number; price: number; details?: Record<string, any>; specifications?: Record<string, any> }[];
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
      valid_until?: string;
      terms_conditions?: string;
      items: { product_id: string; qty: number; price: number; details?: Record<string, any> }[];
    }
  ) => api.put<ApiSuccess<unknown>>(`/orders/${id}`, body),
  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<ApiSuccess<unknown>>(`/orders/${id}/status`, { order_status: status }),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/orders/${id}`),
  payments: (orderId: string) =>
    api.get<ApiSuccess<Payment[]>>(`payments/order/${orderId}`),
};

// Payments
export const paymentsService = {
  list: (p: PageParams = {}) =>
    api.get<ApiPaginated<Payment>>("/payments", { page: p.page ?? 1, limit: p.limit ?? 10 }),
  get: (id: string) => api.get<ApiSuccess<Payment>>(`/payments/${id}`),
  create: (body: {
    order_id: string;
    amount: number;
    payment_type: string;
    bank_account_id: string;
    reference_number: string;
    payment_date?: string;
  }) => api.post<ApiSuccess<unknown>>("/payments", body),
  update: (id: string, body: {
    reference_number?: string;
    payment_type?: string;
  }) => api.put<ApiSuccess<unknown>>(`/payments/${id}`, body),
  delete: (id: string) => api.delete<ApiSuccess<unknown>>(`/payments/${id}`),
};
