import type { BatchPO, Order, User } from "../types";

export type WorkerRole = "tailor" | "cutter" | "finishing" | "sales" | "staff" | "helper";
export type SalaryType = "piece_rate" | "daily" | "monthly";
export type WorkerStatus = "active" | "inactive";

export interface Worker {
  id: string;
  user_id?: string | null;
  user?: Pick<User, "id" | "name" | "email">;
  name: string;
  phone?: string;
  role: WorkerRole;
  salary_type: SalaryType;
  daily_rate?: number;
  status: WorkerStatus;
  created_at?: string;
  updated_at?: string;
}

export type JobType = "jahit" | "potong" | "bordir" | "finishing";

export interface WorkLog {
  id: string;
  work_date: string;
  worker_id: string;
  worker?: Worker;
  worker_name?: string;
  job_type: JobType;
  batch_po_id?: string;
  batch_po?: BatchPO;
  batch_po_name?: string;
  order_id?: string;
  order?: Order;
  order_number?: string;
  customer_name?: string;
  creator?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  qty: number;
  rate_per_qty: number;
  total_amount: number;
  payroll_id?: string;
  payroll_no?: string;
  notes?: string;
  created_at?: string;
}

export type PayrollStatus = "draft" | "approved" | "paid";

export interface Payroll {
  id: string;
  payroll_no: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: PayrollStatus;
  expense_id?: string;
  work_logs?: WorkLog[];
  attendances?: Attendance[];
  created_at?: string;
}

// ─── Attendance Types ─────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "half_day" | "permission" | "alpha";

export interface Attendance {
  id: string;
  worker_id: string;
  worker?: Pick<Worker, "id" | "name" | "role">;
  payroll_id?: string | null;
  payroll_no?: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  work_duration_index: number;
  daily_rate: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/** Payload for creating a single attendance record */
export interface AttendanceCreatePayload {
  worker_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  work_duration_index?: number;
  notes?: string;
}

/** Payload for batch attendance creation */
export interface AttendanceBatchPayload {
  attendance_date: string;
  items: {
    worker_id: string;
    status: AttendanceStatus;
    work_duration_index?: number;
    notes?: string;
  }[];
}
