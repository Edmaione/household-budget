"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import { useTransactions, useCategories, deleteTransaction, updateTransaction } from "@/lib/hooks";
import {
  getMonthKey,
  getMonthLabel,
  prevMonth,
  nextMonth,
  formatCurrency,
  formatDate,
  cn,
} from "@/lib/utils";
import type { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const { transactions, loading, refresh } = useTransactions(monthKey);
  const { categories, subcategories } = useCategories();
  const [search, setSearch] = useState("");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description.toLowerCase().includes(q) ||
        tx.location?.toLowerCase().includes(q) ||
        tx.subcategory?.name?.toLowerCase().includes(q) ||
        tx.subcategory?.category?.name?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    let currentDate = "";
    for (const tx of filtered) {
      if (tx.date !== currentDate) {
        currentDate = tx.date;
        groups.push({ date: tx.date, items: [] });
      }
      groups[groups.length - 1].items.push(tx);
    }
    return groups;
  }, [filtered]);

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    setConfirmDelete(null);
    refresh();
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        {/* Header with Month Picker */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMonthKey(prevMonth(monthKey))}
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
            onClick={() => setMonthKey(nextMonth(monthKey))}
            className="p-2 -mr-2 text-stone-400 hover:text-stone-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Count */}
        <p className="text-xs text-stone-400 mb-3 px-1">
          {filtered.length} transaction{filtered.length !== 1 && "s"}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {grouped.map((group) => (
              <div key={group.date}>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5 px-1">
                  {formatDate(group.date)}
                </p>
                <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden">
                  {group.items.map((tx) => (
                    <div key={tx.id} className="relative">
                      <div
                        onClick={() => setEditingTx(tx)}
                        className="px-3.5 py-3 flex items-center gap-3 cursor-pointer hover:bg-stone-50/50 active:bg-stone-100/50 transition"
                      >
                        <span className="text-base leading-none">
                          {tx.subcategory?.category?.icon || "📦"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-900 truncate">
                            {tx.description}
                          </p>
                          <p className="text-xs text-stone-400 truncate">
                            {tx.subcategory?.category?.name}
                            {tx.subcategory
                              ? ` · ${tx.subcategory.name}`
                              : ""}
                            {tx.location ? ` · ${tx.location}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold font-mono tabular-nums",
                            tx.amount >= 0
                              ? "text-emerald-600"
                              : "text-stone-900"
                          )}
                        >
                          {tx.amount >= 0 ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>

                      {/* Delete confirmation */}
                      {confirmDelete === tx.id && (
                        <div className="absolute inset-0 bg-red-50 flex items-center justify-center gap-2 z-10">
                          <span className="text-sm text-red-700">Delete?</span>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-md font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1 text-xs bg-white text-stone-600 rounded-md border border-stone-200 font-medium"
                          >
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <EditModal
          tx={editingTx}
          subcategories={subcategories}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSave={async (updates) => {
            await updateTransaction(editingTx.id, updates);
            setEditingTx(null);
            refresh();
          }}
          onDelete={() => {
            setEditingTx(null);
            setConfirmDelete(editingTx.id);
          }}
        />
      )}
    </AppShell>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────

function EditModal({
  tx,
  subcategories,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  tx: Transaction;
  subcategories: any[];
  categories: any[];
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
  onDelete: () => void;
}) {
  const [date, setDate] = useState(tx.date);
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)));
  const [location, setLocation] = useState(tx.location || "");
  const [subcategoryId, setSubcategoryId] = useState(tx.subcategory_id);
  const [saving, setSaving] = useState(false);

  const selectedSub = subcategories.find((s: any) => s.id === subcategoryId);
  const selectedCat = selectedSub
    ? categories.find((c: any) => c.id === selectedSub.category_id)
    : null;
  const isIncome = selectedCat?.type === "income";

  const grouped = categories
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((cat: any) => ({
      category: cat,
      items: subcategories
        .filter((s: any) => s.category_id === cat.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
    }))
    .filter((g: any) => g.items.length > 0);

  async function handleSave() {
    if (!description.trim() || !amount || !subcategoryId) return;
    setSaving(true);
    const numAmount = parseFloat(amount);
    const finalAmount = isIncome ? Math.abs(numAmount) : -Math.abs(numAmount);
    await onSave({
      date,
      description: description.trim(),
      amount: finalAmount,
      location: location.trim() || null,
      subcategory_id: subcategoryId,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-900">
            Edit Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Description"
          />
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Location (optional)"
          />
          <select
            value={subcategoryId ?? ""}
            onChange={(e) =>
              setSubcategoryId(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
          >
            <option value="">Pick a category...</option>
            {grouped.map((g: any) => (
              <optgroup
                key={g.category.id}
                label={`${g.category.icon} ${g.category.name}`}
              >
                {g.items.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2.5 text-red-600 bg-red-50 text-sm font-medium rounded-lg hover:bg-red-100 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
