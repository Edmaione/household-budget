export interface Category {
  id: number;
  name: string;
  type: "expense" | "income";
  icon: string;
  sort_order: number;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  sort_order: number;
  // Joined fields
  category?: Category;
}

export interface Budget {
  id: number;
  subcategory_id: number;
  monthly_amount: number;
  // Joined
  subcategory?: Subcategory;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  location: string | null;
  subcategory_id: number | null;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  subcategory?: Subcategory & { category?: Category };
}

export interface CategorySummary {
  category: Category;
  budgetTotal: number;
  actualTotal: number;
  variance: number;
  subcategories: SubcategorySummary[];
}

export interface SubcategorySummary {
  subcategory: Subcategory;
  budgetAmount: number;
  actualAmount: number;
}

// For the autofill feature
export interface AutofillSuggestion {
  description: string;
  amount: number;
  location: string | null;
  subcategory_id: number;
  frequency: number;
}

// ─── Trends ───────────────────────────────────────────────────────

export interface MonthlySummaryRow {
  month: string;
  category_id: number;
  category_name: string;
  category_type: "expense" | "income";
  category_icon: string;
  category_sort: number;
  actual_total: number;
  budget_total: number;
}

export interface MonthlyTotals {
  month: string;
  totalExpense: number;
  totalIncome: number;
  budgetExpense: number;
  budgetIncome: number;
  net: number;
}

export interface CategoryTrend {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryType: "expense" | "income";
  monthlyData: { month: string; actual: number; budget: number }[];
}
