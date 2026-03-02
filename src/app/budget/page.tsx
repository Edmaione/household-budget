"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useBudgets } from "@/lib/hooks";
import { formatCurrency, cn } from "@/lib/utils";

export default function BudgetPage() {
  const { budgets, loading, updateBudget } = useBudgets();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Group budgets by category
  const grouped = useMemo(() => {
    const groups: Record<
      string,
      {
        category: { id: number; name: string; icon: string; type: string; sort_order: number };
        items: typeof budgets;
      }
    > = {};

    for (const b of budgets) {
      const cat = b.subcategory?.category;
      if (!cat) continue;
      if (!groups[cat.id]) {
        groups[cat.id] = { category: cat, items: [] };
      }
      groups[cat.id].items.push(b);
    }

    return Object.values(groups).sort(
      (a, b) => a.category.sort_order - b.category.sort_order
    );
  }, [budgets]);

  const totalExpenseBudget = budgets
    .filter((b) => b.subcategory?.category?.type === "expense")
    .reduce((sum, b) => sum + Number(b.monthly_amount), 0);

  const totalIncomeBudget = budgets
    .filter((b) => b.subcategory?.category?.type === "income")
    .reduce((sum, b) => sum + Number(b.monthly_amount), 0);

  function startEdit(subcategoryId: number, currentAmount: number) {
    setEditingId(subcategoryId);
    setEditValue(String(currentAmount));
  }

  async function saveEdit(subcategoryId: number) {
    const amount = parseFloat(editValue) || 0;
    await updateBudget(subcategoryId, amount);
    setEditingId(null);
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <h1 className="text-lg font-semibold text-stone-900 mb-1">
          Monthly Budget
        </h1>
        <p className="text-sm text-stone-400 mb-5">
          Tap any amount to edit
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Totals */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Income Plan
                </p>
                <p className="text-base font-semibold font-mono tabular-nums text-stone-900">
                  {formatCurrency(totalIncomeBudget)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Expense Plan
                </p>
                <p className="text-base font-semibold font-mono tabular-nums text-stone-900">
                  {formatCurrency(totalExpenseBudget)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Net Plan
                </p>
                <p
                  className={cn(
                    "text-base font-semibold font-mono tabular-nums",
                    totalIncomeBudget - totalExpenseBudget >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {totalIncomeBudget - totalExpenseBudget >= 0 ? "+" : "-"}
                  {formatCurrency(totalIncomeBudget - totalExpenseBudget)}
                </p>
              </div>
            </div>

            {/* Budget Items by Category */}
            <div className="space-y-4 pb-4">
              {grouped.map((group) => {
                const groupTotal = group.items.reduce(
                  (sum, b) => sum + Number(b.monthly_amount),
                  0
                );
                return (
                  <div key={group.category.id}>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                        {group.category.icon} {group.category.name}
                      </h2>
                      <span className="text-xs font-mono text-stone-400">
                        {formatCurrency(groupTotal)}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                      {group.items.map((b) => (
                        <div
                          key={b.subcategory_id}
                          className="px-3.5 py-2.5 flex items-center justify-between"
                        >
                          <span className="text-sm text-stone-700">
                            {b.subcategory?.name}
                          </span>
                          {editingId === b.subcategory_id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-stone-400">$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    saveEdit(b.subcategory_id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onBlur={() => saveEdit(b.subcategory_id)}
                                autoFocus
                                className="w-20 text-right text-sm font-mono px-2 py-1 bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                startEdit(
                                  b.subcategory_id,
                                  Number(b.monthly_amount)
                                )
                              }
                              className="text-sm font-mono tabular-nums text-stone-900 hover:text-blue-600 transition px-2 py-1 -mr-2 rounded-md hover:bg-blue-50"
                            >
                              {formatCurrency(Number(b.monthly_amount))}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
