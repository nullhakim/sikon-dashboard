// Expense Management types

export interface ExpenseCategory {
  id: string;
  name: string;
  type: "HPP" | "OPEX" | string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  expense_category_id: string;
  category_name?: string;
  category_type?: string;
  batch_po_id?: string | null;
  batch_po_name?: string | null;
  created_by_id: string;
  creator_name?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
