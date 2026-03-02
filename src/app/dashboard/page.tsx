"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useMonthlySummary, useSubcategoryTransactions } from "@/lib/hooks";
import {
  getMonthKey,
  getMonthLabel,
  prevMonth,
  nextMonth,
  formatCurrency,
  formatDate,
  cn,
} from "@/lib/utils";

export default function DashboardPage() {
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const prevMonthKey = prevMonth(monthKey);
  const { summary, totals, loading } = useMonthlySummary(monthKey);
  const { totals: prevTotals, loading: prevLoading } = useMonthlySummary(prevMonthKey);
  const [expandedCat, setExpandedCat] = useState<number | null>(null);
  const [expandedSubcat, setExpandedSubcat] = useState<number | null>(null);
  const { transactions: subcatTransactions, loading: txLoading } =
    useSubcategoryTransactions(expandedSubcat, monthKey);

  const expenseSummary = summary.filter((s) => s.category.type === "expense");
  const incomeSummary = summary.filter((s) => s.category.type === "income");

  const netBudget = totals.budgetIncome - totals.budgetExpense;
  const netActual = totals.actualIncome + totals.actualExpense; // actualExpense is negative
  const prevNetActual = prevTotals.actualIncome + prevTotals.actualExpense;

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Month Picker */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setMonthKey(prevMonth(monthKey)); setExpandedCat(null); setExpandedSubcat(null); }}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-stone-900">
            {getMonthLabel(monthKey)}
          </h1>
          <button
            onClick={() => { setMonthKey(nextMonth(monthKey)); setExpandedCat(null); setExpandedSubcat(null); }}
            className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {loading || prevLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Current Month Label */}
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5 px-1">
              {getMonthLabel(monthKey)}
            </p>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <SummaryCard
                label="Income"
                budget={totals.budgetIncome}
                actual={totals.actualIncome}
                isIncome
              />
              <SummaryCard
                label="Spending"
                budget={totals.budgetExpense}
                actual={Math.abs(totals.actualExpense)}
              />
              <div className="bg-white rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Net
                </p>
                <p
                  className={cn(
                    "text-base font-semibold font-mono tabular-nums",
                    netActual >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {netActual >= 0 ? "+" : "-"}{formatCurrency(netActual)}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  plan {netBudget >= 0 ? "+" : "-"}{formatCurrency(netBudget)}
                </p>
              </div>
            </div>

            {/* Previous Month Label */}
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1.5 px-1">
              {getMonthLabel(prevMonthKey)}
            </p>

            {/* Previous Month Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Income
                </p>
                <p className="text-sm font-semibold font-mono tabular-nums text-stone-500">
                  {formatCurrency(prevTotals.actualIncome)}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Spending
                </p>
                <p className="text-sm font-semibold font-mono tabular-nums text-stone-500">
                  {formatCurrency(Math.abs(prevTotals.actualExpense))}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
                  Net
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold font-mono tabular-nums",
                    prevNetActual >= 0 ? "text-emerald-500" : "text-red-400"
                  )}
                >
                  {prevNetActual >= 0 ? "+" : "-"}{formatCurrency(prevNetActual)}
                </p>
              </div>
            </div>

            {/* Income Section */}
            {incomeSummary.length > 0 && incomeSummary.some((s) => s.actualTotal !== 0 || s.budgetTotal > 0) && (
              <div className="mb-4">
                <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                  Income
                </h2>
                <div className="space-y-1.5">
                  {incomeSummary
                    .filter((s) => s.actualTotal !== 0 || s.budgetTotal > 0)
                    .map((item) => (
                      <CategoryRow
                        key={item.category.id}
                        item={item}
                        isIncome
                        expanded={expandedCat === item.category.id}
                        onToggle={() => {
                          setExpandedCat(expandedCat === item.category.id ? null : item.category.id);
                          setExpandedSubcat(null);
                        }}
                        expandedSubcat={expandedSubcat}
                        onToggleSubcat={(id) => setExpandedSubcat(expandedSubcat === id ? null : id)}
                        subcatTransactions={subcatTransactions}
                        txLoading={txLoading}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Expense Section */}
            <div className="mb-4">
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
                Expenses
              </h2>
              <div className="space-y-1.5">
                {expenseSummary
                  .filter((s) => s.actualTotal !== 0 || s.budgetTotal > 0)
                  .map((item) => (
                    <CategoryRow
                      key={item.category.id}
                      item={item}
                      expanded={expandedCat === item.category.id}
                      onToggle={() => {
                        setExpandedCat(expandedCat === item.category.id ? null : item.category.id);
                        setExpandedSubcat(null);
                      }}
                      expandedSubcat={expandedSubcat}
                      onToggleSubcat={(id) => setExpandedSubcat(expandedSubcat === id ? null : id)}
                      subcatTransactions={subcatTransactions}
                      txLoading={txLoading}
                    />
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ─── Components ────────────────────────────────────────────────────

function SummaryCard({
  label,
  budget,
  actual,
  isIncome,
}: {
  label: string;
  budget: number;
  actual: number;
  isIncome?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-stone-200">
      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-base font-semibold font-mono tabular-nums text-stone-900">
        {formatCurrency(actual)}
      </p>
      <p className="text-[10px] text-stone-400 mt-0.5">
        of {formatCurrency(budget)}
      </p>
    </div>
  );
}

function CategoryRow({
  item,
  isIncome,
  expanded,
  onToggle,
  expandedSubcat,
  onToggleSubcat,
  subcatTransactions,
  txLoading,
}: {
  item: CategorySummary;
  isIncome?: boolean;
  expanded: boolean;
  onToggle: () => void;
  expandedSubcat: number | null;
  onToggleSubcat: (id: number) => void;
  subcatTransactions: Transaction[];
  txLoading: boolean;
}) {
  const actual = Math.abs(item.actualTotal);
  const budget = item.budgetTotal;
  const pct = budget > 0 ? Math.min((actual / budget) * 100, 100) : actual > 0 ? 100 : 0;

  const isOver = !isIncome && actual > budget && budget > 0;
  const isUnder = isIncome ? item.actualTotal < budget : false;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3.5 py-3 flex items-center gap-3 text-left hover:bg-stone-50/50 transition"
      >
        <span className="text-lg leading-none">{item.category.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-stone-900 truncate">
              {item.category.name}
            </span>
            <span
              className={cn(
                "text-sm font-semibold font-mono tabular-nums",
                isOver ? "text-red-600" : "text-stone-900"
              )}
            >
              {formatCurrency(actual)}
            </span>
          </div>
          {/* Progress bar */}
          {budget > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isOver ? "bg-red-500" : "bg-blue-500"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-stone-400 w-16 text-right">
                {formatCurrency(budget)}
              </span>
            </div>
          )}
        </div>
        <svg
          className={cn(
            "w-4 h-4 text-stone-300 transition-transform",
            expanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Subcategory Drill-down */}
      {expanded && (
        <div className="border-t border-stone-100 bg-stone-50/50">
          {item.subcategories
            .filter((s) => s.actualAmount !== 0 || s.budgetAmount > 0)
            .map((sub) => {
              const subActual = Math.abs(sub.actualAmount);
              const subOver =
                !isIncome && subActual > sub.budgetAmount && sub.budgetAmount > 0;
              const isSubExpanded = expandedSubcat === sub.subcategory.id;
              return (
                <div key={sub.subcategory.id}>
                  <button
                    onClick={() => onToggleSubcat(sub.subcategory.id)}
                    className="w-full pl-12 pr-4 py-2 flex items-center justify-between hover:bg-stone-100/50 transition text-left"
                  >
                    <span className="text-xs text-stone-600 flex items-center gap-1 min-w-0">
                      <span className="truncate">{sub.subcategory.name}</span>
                      <svg
                        className={cn(
                          "w-3 h-3 text-stone-300 transition-transform shrink-0",
                          isSubExpanded && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span
                        className={cn(
                          "text-xs font-mono tabular-nums",
                          subOver ? "text-red-600 font-medium" : "text-stone-700"
                        )}
                      >
                        {formatCurrency(subActual)}
                      </span>
                      {sub.budgetAmount > 0 && (
                        <span className="text-[10px] font-mono text-stone-400 w-14 text-right">
                          / {formatCurrency(sub.budgetAmount)}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Transaction Drill-down */}
                  {isSubExpanded && (
                    <div className="ml-14 mr-3 mb-1 border-l-2 border-stone-200">
                      {txLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : subcatTransactions.length === 0 ? (
                        <p className="text-[11px] text-stone-400 py-2 pl-3">No transactions</p>
                      ) : (
                        subcatTransactions.map((tx) => (
                          <div key={tx.id} className="px-3 py-1.5 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-stone-400 font-mono shrink-0">
                                  {formatDate(tx.date)}
                                </span>
                                <span className="text-xs text-stone-700 truncate">
                                  {tx.description}
                                </span>
                              </div>
                              {tx.location && (
                                <p className="text-[10px] text-stone-400 truncate pl-[3.25rem]">
                                  {tx.location}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-mono tabular-nums text-stone-600 shrink-0 ml-2">
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// Type import for component
import type { CategorySummary, Transaction } from "@/lib/types";
