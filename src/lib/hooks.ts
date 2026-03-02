"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type {
  Category,
  Subcategory,
  Transaction,
  Budget,
  CategorySummary,
  AutofillSuggestion,
  MonthlySummaryRow,
  MonthlyTotals,
  CategoryTrend,
} from "@/lib/types";

// Lazy singleton — only created when first accessed (avoids server prerender crash)
let _supabase: ReturnType<typeof createClient>;
function supabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

// ─── Categories & Subcategories ────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [catRes, subRes] = await Promise.all([
        supabase().from("categories").select("*").order("sort_order"),
        supabase()
          .from("subcategories")
          .select("*, category:categories(*)")
          .order("sort_order"),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (subRes.data) setSubcategories(subRes.data);
      setLoading(false);
    }
    load();
  }, []);

  return { categories, subcategories, loading };
}

export function useManageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [catRes, subRes] = await Promise.all([
      supabase().from("categories").select("*").order("sort_order"),
      supabase().from("subcategories").select("*, category:categories(*)").order("sort_order"),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { categories, subcategories, loading, refresh: load };
}

// ─── Category & Subcategory CRUD ────────────────────────────────────

export async function createCategory(cat: {
  name: string;
  type: "expense" | "income";
  icon: string;
  sort_order: number;
}) {
  return supabase().from("categories").insert(cat).select().single();
}

export async function updateCategory(
  id: number,
  updates: Partial<{ name: string; icon: string; sort_order: number }>
) {
  return supabase().from("categories").update(updates).eq("id", id);
}

export async function deleteCategory(id: number) {
  return supabase().from("categories").delete().eq("id", id);
}

export async function createSubcategory(sub: {
  name: string;
  category_id: number;
  sort_order: number;
}) {
  return supabase().from("subcategories").insert(sub).select().single();
}

export async function updateSubcategory(
  id: number,
  updates: Partial<{ name: string; sort_order: number }>
) {
  return supabase().from("subcategories").update(updates).eq("id", id);
}

export async function deleteSubcategory(id: number) {
  return supabase().from("subcategories").delete().eq("id", id);
}

// ─── Transactions ──────────────────────────────────────────────────

export function useTransactions(monthKey?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase()
      .from("transactions")
      .select("*, subcategory:subcategories(*, category:categories(*))")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (monthKey) {
      const start = monthKey;
      const d = new Date(monthKey + "T00:00:00");
      d.setMonth(d.getMonth() + 1);
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      query = query.gte("date", start).lt("date", end);
    }

    const { data } = await query;
    if (data) setTransactions(data);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, loading, refresh: load };
}

// ─── Monthly Summary ───────────────────────────────────────────────

export function useMonthlySummary(monthKey: string) {
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [totals, setTotals] = useState({
    budgetIncome: 0,
    actualIncome: 0,
    budgetExpense: 0,
    actualExpense: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch categories, subcategories with budgets, and transactions for the month
    const [catRes, subRes, txRes] = await Promise.all([
      supabase().from("categories").select("*").order("sort_order"),
      supabase().from("subcategories").select("*, budgets(monthly_amount)").order("sort_order"),
      (() => {
        const start = monthKey;
        const d = new Date(monthKey + "T00:00:00");
        d.setMonth(d.getMonth() + 1);
        const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        return supabase()
          .from("transactions")
          .select("amount, subcategory_id")
          .gte("date", start)
          .lt("date", end);
      })(),
    ]);

    const categories = catRes.data || [];
    const subcats = subRes.data || [];
    const txns = txRes.data || [];

    // Build actual totals by subcategory
    const actualBySubcat: Record<number, number> = {};
    for (const tx of txns) {
      if (tx.subcategory_id) {
        actualBySubcat[tx.subcategory_id] =
          (actualBySubcat[tx.subcategory_id] || 0) + Number(tx.amount);
      }
    }

    // Build summary
    let budgetIncome = 0, actualIncome = 0, budgetExpense = 0, actualExpense = 0;

    const result: CategorySummary[] = categories.map((cat) => {
      const catSubcats = subcats.filter((s) => s.category_id === cat.id);
      let catBudget = 0;
      let catActual = 0;

      const subcategorySummaries = catSubcats.map((sub) => {
        const budget = sub.budgets?.[0]?.monthly_amount || 0;
        const actual = actualBySubcat[sub.id] || 0;
        catBudget += Number(budget);
        catActual += Number(actual);
        return {
          subcategory: sub,
          budgetAmount: Number(budget),
          actualAmount: Number(actual),
        };
      });

      if (cat.type === "income") {
        budgetIncome += catBudget;
        actualIncome += catActual;
      } else {
        budgetExpense += catBudget;
        actualExpense += catActual;
      }

      return {
        category: cat,
        budgetTotal: catBudget,
        actualTotal: catActual,
        variance: catBudget - Math.abs(catActual),
        subcategories: subcategorySummaries,
      };
    });

    setSummary(result);
    setTotals({ budgetIncome, actualIncome, budgetExpense, actualExpense });
    setLoading(false);
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, totals, loading, refresh: load };
}

// ─── Subcategory Transactions (lazy-loaded) ─────────────────────────

export function useSubcategoryTransactions(
  subcategoryId: number | null,
  monthKey: string
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subcategoryId === null) {
      setTransactions([]);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const start = monthKey;
      const d = new Date(monthKey + "T00:00:00");
      d.setMonth(d.getMonth() + 1);
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

      const { data } = await supabase()
        .from("transactions")
        .select("id, date, description, amount, location")
        .eq("subcategory_id", subcategoryId)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [subcategoryId, monthKey]);

  return { transactions, loading };
}

// ─── Budgets ───────────────────────────────────────────────────────

export function useBudgets() {
  const [budgets, setBudgets] = useState<(Budget & { subcategory: Subcategory & { category: Category } })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase()
      .from("budgets")
      .select("*, subcategory:subcategories(*, category:categories(*))")
      .order("subcategory_id");
    if (data) setBudgets(data as typeof budgets);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateBudget = async (subcategoryId: number, amount: number) => {
    await supabase()
      .from("budgets")
      .upsert({ subcategory_id: subcategoryId, monthly_amount: amount }, { onConflict: "subcategory_id" });
    await load();
  };

  return { budgets, loading, updateBudget, refresh: load };
}

// ─── Autofill Suggestions ──────────────────────────────────────────

export function useAutofill() {
  const [suggestions, setSuggestions] = useState<AutofillSuggestion[]>([]);

  useEffect(() => {
    async function load() {
      // Get recent unique transactions for autofill
      const { data } = await supabase()
        .from("transactions")
        .select("description, amount, location, subcategory_id")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data) return;

      // Group by description (case-insensitive) and pick most common values
      const groups: Record<string, { amounts: number[]; locations: (string | null)[]; subcategories: number[]; count: number }> = {};

      for (const tx of data) {
        const key = tx.description.toLowerCase().trim();
        if (!groups[key]) {
          groups[key] = { amounts: [], locations: [], subcategories: [], count: 0 };
        }
        groups[key].amounts.push(Number(tx.amount));
        groups[key].locations.push(tx.location);
        if (tx.subcategory_id) groups[key].subcategories.push(tx.subcategory_id);
        groups[key].count++;
      }

      const result: AutofillSuggestion[] = Object.entries(groups).map(
        ([, group]) => ({
          description: data.find(
            (d) => d.description.toLowerCase().trim() === Object.keys(groups).find((k) => groups[k] === group)
          )?.description || "",
          amount: group.amounts[0], // most recent amount
          location: group.locations.find((l) => l) || null,
          subcategory_id: group.subcategories[0] || 0,
          frequency: group.count,
        })
      );

      // Sort by frequency (most common first)
      result.sort((a, b) => b.frequency - a.frequency);
      setSuggestions(result);
    }
    load();
  }, []);

  const search = useCallback(
    (query: string): AutofillSuggestion[] => {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      return suggestions
        .filter((s) => s.description.toLowerCase().includes(q))
        .slice(0, 5);
    },
    [suggestions]
  );

  return { suggestions, search };
}

// ─── Transaction CRUD ──────────────────────────────────────────────

export async function createTransaction(tx: {
  date: string;
  description: string;
  amount: number;
  location?: string;
  subcategory_id: number;
}) {
  return supabase().from("transactions").insert({
    ...tx,
    location: tx.location || null,
  });
}

export async function updateTransaction(
  id: string,
  updates: Partial<{
    date: string;
    description: string;
    amount: number;
    location: string | null;
    subcategory_id: number;
  }>
) {
  return supabase().from("transactions").update(updates).eq("id", id);
}

export async function deleteTransaction(id: string) {
  return supabase().from("transactions").delete().eq("id", id);
}

// ─── Trends ───────────────────────────────────────────────────────

import { getMonthKey } from "@/lib/utils";

export interface TwelveMonthAvg {
  expense: number;
  income: number;
  net: number;
  byCategory: Record<number, number>;
}

export function useTrendData(monthCount: number = 6) {
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [twelveMonthAvg, setTwelveMonthAvg] = useState<TwelveMonthAvg>({
    expense: 0,
    income: 0,
    net: 0,
    byCategory: {},
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const now = new Date();

    // Always fetch at least 12 months for the 12-month average
    const fetchCount = Math.max(monthCount, 12);
    const fetchStart = new Date(now.getFullYear(), now.getMonth() - (fetchCount - 1), 1);
    const fetchStartKey = getMonthKey(fetchStart);

    // Generate all fetched months
    const fetchedMonths: string[] = [];
    for (let i = 0; i < fetchCount; i++) {
      const d = new Date(fetchStart.getFullYear(), fetchStart.getMonth() + i, 1);
      fetchedMonths.push(getMonthKey(d));
    }

    // Display months (the last `monthCount` months)
    const displayMonths = fetchedMonths.slice(fetchedMonths.length - monthCount);
    setMonths(displayMonths);

    const { data } = await supabase()
      .from("monthly_summary")
      .select("*")
      .gte("month", fetchStartKey)
      .order("month")
      .order("category_sort");

    const rows = (data as MonthlySummaryRow[]) || [];

    // Build monthly totals for ALL fetched months
    const totalsMap: Record<string, MonthlyTotals> = {};
    for (const m of fetchedMonths) {
      totalsMap[m] = {
        month: m,
        totalExpense: 0,
        totalIncome: 0,
        budgetExpense: 0,
        budgetIncome: 0,
        net: 0,
      };
    }

    // Track budget per category per month (avoid double-counting)
    const budgetSeen: Record<string, Set<number>> = {};

    for (const row of rows) {
      const m = row.month;
      if (!totalsMap[m]) continue;

      if (!budgetSeen[m]) budgetSeen[m] = new Set();

      if (row.category_type === "expense") {
        totalsMap[m].totalExpense += Math.abs(Number(row.actual_total));
        if (!budgetSeen[m].has(row.category_id)) {
          totalsMap[m].budgetExpense += Number(row.budget_total);
          budgetSeen[m].add(row.category_id);
        }
      } else {
        totalsMap[m].totalIncome += Number(row.actual_total);
        if (!budgetSeen[m].has(row.category_id)) {
          totalsMap[m].budgetIncome += Number(row.budget_total);
          budgetSeen[m].add(row.category_id);
        }
      }
    }

    // Calculate net
    for (const m of fetchedMonths) {
      totalsMap[m].net = totalsMap[m].totalIncome - totalsMap[m].totalExpense;
    }

    // Return only display months for charts
    setMonthlyTotals(displayMonths.map((m) => totalsMap[m]));

    // ─── Compute 12-month averages ───────────────────────────────
    const allTotals = fetchedMonths.map((m) => totalsMap[m]);
    const monthsWithData = allTotals.filter(
      (t) => t.totalExpense > 0 || t.totalIncome > 0
    );
    const n = monthsWithData.length || 1;
    const avgExpense = monthsWithData.reduce((s, t) => s + t.totalExpense, 0) / n;
    const avgIncome = monthsWithData.reduce((s, t) => s + t.totalIncome, 0) / n;

    // Per-category 12-month averages
    const catTotals: Record<number, number> = {};
    const catMonthCounts: Record<number, number> = {};
    for (const row of rows) {
      if (row.category_type !== "expense") continue;
      const id = row.category_id;
      const actual = Math.abs(Number(row.actual_total));
      if (actual > 0) {
        catTotals[id] = (catTotals[id] || 0) + actual;
        catMonthCounts[id] = (catMonthCounts[id] || 0) + 1;
      }
    }
    const byCategory: Record<number, number> = {};
    for (const id of Object.keys(catTotals)) {
      const numId = Number(id);
      byCategory[numId] = catTotals[numId] / (catMonthCounts[numId] || 1);
    }

    setTwelveMonthAvg({
      expense: avgExpense,
      income: avgIncome,
      net: avgIncome - avgExpense,
      byCategory,
    });

    // Build category trends (expenses only) — display months only
    const catMap: Record<number, CategoryTrend> = {};
    for (const row of rows) {
      if (row.category_type !== "expense") continue;
      if (!catMap[row.category_id]) {
        catMap[row.category_id] = {
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryIcon: row.category_icon,
          categoryType: row.category_type,
          monthlyData: displayMonths.map((m) => ({ month: m, actual: 0, budget: 0 })),
        };
      }
      const monthIdx = displayMonths.indexOf(row.month);
      if (monthIdx >= 0) {
        catMap[row.category_id].monthlyData[monthIdx] = {
          month: row.month,
          actual: Math.abs(Number(row.actual_total)),
          budget: Number(row.budget_total),
        };
      }
    }

    // Sort by average spend descending
    const trends = Object.values(catMap).sort((a, b) => {
      const avgA = a.monthlyData.reduce((s, d) => s + d.actual, 0) / monthCount;
      const avgB = b.monthlyData.reduce((s, d) => s + d.actual, 0) / monthCount;
      return avgB - avgA;
    });

    setCategoryTrends(trends);
    setLoading(false);
  }, [monthCount]);

  useEffect(() => {
    load();
  }, [load]);

  return { monthlyTotals, categoryTrends, months, twelveMonthAvg, loading };
}

