"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  useCategories,
  useAutofill,
  createTransaction,
} from "@/lib/hooks";
import { todayString, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import type { AutofillSuggestion, Transaction } from "@/lib/types";

const supabase = createClient();

interface RowData {
  id: number;
  date: string;
  description: string;
  amount: string;
  location: string;
  subcategoryId: number | null;
  saved: boolean;
  saving: boolean;
  error: boolean;
}

interface SessionEntry {
  description: string;
  amount: number;
  category: string;
  date: string;
  time: string;
}

function emptyRow(id: number): RowData {
  return {
    id,
    date: todayString(),
    description: "",
    amount: "",
    location: "",
    subcategoryId: null,
    saved: false,
    saving: false,
    error: false,
  };
}

export default function AddPage() {
  const router = useRouter();
  const { categories, subcategories, loading: catsLoading } = useCategories();
  const { search: searchAutofill } = useAutofill();
  const [mode, setMode] = useState<"single" | "batch">("batch");

  // ── Session log (sidebar) ──
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadRecent() {
      const { data } = await supabase
        .from("transactions")
        .select("*, subcategory:subcategories(*, category:categories(*))")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setRecentTxns(data);
    }
    loadRecent();
  }, []);

  function logSession(desc: string, amount: number, subcatId: number | null, date: string) {
    const sub = subcategories.find((s) => s.id === subcatId);
    const cat = sub ? categories.find((c) => c.id === sub.category_id) : null;
    const label = cat ? `${cat.icon} ${sub?.name}` : "Uncategorized";
    setSessionEntries((prev) => [
      { description: desc, amount, category: label, date, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
      ...prev,
    ]);
    // Also refresh the recent list
    supabase
      .from("transactions")
      .select("*, subcategory:subcategories(*, category:categories(*))")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setRecentTxns(data); });
  }

  // ── Single mode state ──
  const [sDate, setSDate] = useState(todayString());
  const [sDesc, setSDesc] = useState("");
  const [sAmount, setSAmount] = useState("");
  const [sLocation, setSLocation] = useState("");
  const [sSubcatId, setSSubcatId] = useState<number | null>(null);
  const [sSaving, setSSaving] = useState(false);
  const [sSaved, setSSaved] = useState(false);
  const [suggestions, setSuggestions] = useState<AutofillSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const sDescRef = useRef<HTMLInputElement>(null);

  // ── Batch mode state ──
  const [nextId, setNextId] = useState(4);
  const [rows, setRows] = useState<RowData[]>([
    emptyRow(1),
    emptyRow(2),
    emptyRow(3),
  ]);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const [activeAutofill, setActiveAutofill] = useState<{
    rowId: number;
    suggestions: AutofillSuggestion[];
  } | null>(null);

  // ── Shared helpers ──
  const grouped = categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => ({
      category: cat,
      items: subcategories
        .filter((s) => s.category_id === cat.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((g) => g.items.length > 0);

  const getIsIncome = useCallback(
    (subcategoryId: number | null) => {
      if (!subcategoryId) return false;
      const sub = subcategories.find((s) => s.id === subcategoryId);
      if (!sub) return false;
      const cat = categories.find((c) => c.id === sub.category_id);
      return cat?.type === "income";
    },
    [categories, subcategories]
  );

  // ── Single mode handlers ──
  function handleSDescChange(value: string) {
    setSDesc(value);
    const results = searchAutofill(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0 && value.length >= 2);
  }

  function applySingleSuggestion(s: AutofillSuggestion) {
    setSDesc(s.description);
    setSAmount(String(Math.abs(s.amount)));
    if (s.location) setSLocation(s.location);
    if (s.subcategory_id) setSSubcatId(s.subcategory_id);
    setShowSuggestions(false);
  }

  async function handleSingleSave() {
    if (!sDesc.trim() || !sAmount || !sSubcatId) return;
    setSSaving(true);
    const num = parseFloat(sAmount);
    const final = getIsIncome(sSubcatId) ? Math.abs(num) : -Math.abs(num);
    const { error } = await createTransaction({
      date: sDate,
      description: sDesc.trim(),
      amount: final,
      location: sLocation.trim() || undefined,
      subcategory_id: sSubcatId,
    });
    setSSaving(false);
    if (!error) {
      logSession(sDesc.trim(), final, sSubcatId, sDate);
      setSSaved(true);
      setTimeout(() => {
        setSDesc("");
        setSAmount("");
        setSLocation("");
        setSSubcatId(null);
        setSDate(todayString());
        setSSaved(false);
        sDescRef.current?.focus();
      }, 600);
    }
  }

  // ── Batch mode handlers ──
  function updateRow(id: number, field: keyof RowData, value: string | number | null) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value, saved: false } : r))
    );
  }

  function handleBatchDescChange(rowId: number, value: string) {
    updateRow(rowId, "description", value);
    const results = searchAutofill(value);
    if (results.length > 0 && value.length >= 2) {
      setActiveAutofill({ rowId, suggestions: results });
    } else {
      setActiveAutofill(null);
    }
  }

  function applyBatchSuggestion(rowId: number, s: AutofillSuggestion) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              description: s.description,
              amount: String(Math.abs(s.amount)),
              location: s.location || "",
              subcategoryId: s.subcategory_id || null,
              saved: false,
            }
          : r
      )
    );
    setActiveAutofill(null);
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow(nextId)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function isRowValid(r: RowData) {
    return r.description.trim() && r.amount && r.subcategoryId && !r.saved;
  }

  async function saveAllRows() {
    const toSave = rows.filter(isRowValid);
    if (toSave.length === 0) return;
    setBatchSaving(true);

    for (const row of toSave) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, saving: true } : r))
      );
      const num = parseFloat(row.amount);
      const final = getIsIncome(row.subcategoryId)
        ? Math.abs(num)
        : -Math.abs(num);
      const { error } = await createTransaction({
        date: row.date,
        description: row.description.trim(),
        amount: final,
        location: row.location.trim() || undefined,
        subcategory_id: row.subcategoryId!,
      });
      if (!error) {
        logSession(row.description.trim(), final, row.subcategoryId, row.date);
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, saving: false, saved: !error, error: !!error } : r
        )
      );
    }
    setBatchSaving(false);
    setBatchDone(true);
    setTimeout(() => setBatchDone(false), 2000);
  }

  function clearSaved() {
    const remaining = rows.filter((r) => !r.saved);
    if (remaining.length === 0) {
      setRows([emptyRow(nextId)]);
      setNextId((n) => n + 1);
    } else {
      setRows(remaining);
    }
  }

  const validCount = rows.filter(isRowValid).length;
  const savedCount = rows.filter((r) => r.saved).length;
  const sIsValid = sDesc.trim() && sAmount && sSubcatId;
  const sessionTotal = sessionEntries.reduce((s, e) => s + e.amount, 0);

  if (catsLoading) {
    return (
      <AppShell wide>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <div className="flex gap-6 px-4 pt-6">
        {/* ═══ Main Entry Column ═══ */}
        <div className="flex-1 max-w-2xl">
          {/* Header + Mode Toggle */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-semibold text-stone-900">Add</h1>
            <div className="flex bg-stone-100 rounded-lg p-0.5">
              <button
                onClick={() => setMode("single")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  mode === "single"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
                )}
              >
                Single
              </button>
              <button
                onClick={() => setMode("batch")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  mode === "batch"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500"
                )}
              >
                Batch
              </button>
            </div>
          </div>

          {mode === "single" ? (
            /* ═══ SINGLE MODE ═══ */
            <div className="space-y-4">
              <Field label="Date">
                <input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} className="input-field" />
              </Field>
              <Field label="Description">
                <div className="relative">
                  <input
                    ref={sDescRef}
                    type="text"
                    value={sDesc}
                    onChange={(e) => handleSDescChange(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0 && sDesc.length >= 2) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="e.g. Food Shopping, Paycheck..."
                    className="input-field"
                    autoComplete="off"
                  />
                  {showSuggestions && <AutofillDropdown items={suggestions} onSelect={applySingleSuggestion} />}
                </div>
              </Field>
              <Field label="Amount">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">$</span>
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={sAmount} onChange={(e) => setSAmount(e.target.value)} placeholder="0.00" className="input-field" style={{ paddingLeft: '2rem' }} />
                </div>
              </Field>
              <Field label="Where" optional>
                <input type="text" value={sLocation} onChange={(e) => setSLocation(e.target.value)} placeholder="e.g. Stop & Shop, Amazon..." className="input-field" />
              </Field>
              <Field label="Category">
                <CategorySelect value={sSubcatId} onChange={setSSubcatId} grouped={grouped} />
              </Field>
              <div className="flex gap-3 pt-2 pb-4">
                <button onClick={handleSingleSave} disabled={!sIsValid || sSaving} className={cn("flex-1 py-3 font-medium rounded-xl transition", sSaved ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800", (!sIsValid || sSaving) && "opacity-40 cursor-not-allowed")}>
                  {sSaved ? "✓ Saved" : sSaving ? "Saving..." : "Save & Add Another"}
                </button>
                <button onClick={() => { handleSingleSave().then(() => setTimeout(() => router.push("/dashboard"), 700)); }} disabled={!sIsValid || sSaving} className="px-5 py-3 text-stone-600 bg-stone-100 font-medium rounded-xl hover:bg-stone-200 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ═══ BATCH MODE ═══ */
            <div>
              <div className="space-y-3 mb-4">
                {rows.map((row, idx) => (
                  <div key={row.id} className={cn("bg-white rounded-xl border p-3 transition-all", row.saved ? "border-emerald-200 bg-emerald-50/50" : row.error ? "border-red-200 bg-red-50/50" : "border-stone-200")}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-400">#{idx + 1}</span>
                        {row.saved && <span className="text-xs text-emerald-600 font-medium">✓ saved</span>}
                        {row.saving && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                      </div>
                      {rows.length > 1 && !row.saved && (
                        <button onClick={() => removeRow(row.id)} className="p-1 text-stone-300 hover:text-red-500 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                    {row.saved ? (
                      <div className="text-sm text-emerald-700">{row.description} — ${Math.abs(parseFloat(row.amount)).toFixed(2)}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="col-span-2 sm:col-span-1 input-sm" />
                        <div className="col-span-2 sm:col-span-1 relative">
                          <input type="text" value={row.description} onChange={(e) => handleBatchDescChange(row.id, e.target.value)} onFocus={() => { const r = searchAutofill(row.description); if (r.length > 0 && row.description.length >= 2) setActiveAutofill({ rowId: row.id, suggestions: r }); }} onBlur={() => setTimeout(() => setActiveAutofill(null), 200)} placeholder="Description" className="input-sm w-full" autoComplete="off" />
                          {activeAutofill?.rowId === row.id && <AutofillDropdown items={activeAutofill.suggestions} onSelect={(s) => applyBatchSuggestion(row.id, s)} />}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none">$</span>
                          <input type="number" inputMode="decimal" step="0.01" min="0" value={row.amount} onChange={(e) => updateRow(row.id, "amount", e.target.value)} placeholder="0.00" className="input-sm w-full" style={{ paddingLeft: '1.75rem' }} />
                        </div>
                        <input type="text" value={row.location} onChange={(e) => updateRow(row.id, "location", e.target.value)} placeholder="Where (optional)" className="input-sm" />
                        <div className="col-span-2">
                          <CategorySelect value={row.subcategoryId} onChange={(v) => updateRow(row.id, "subcategoryId", v)} grouped={grouped} small />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="w-full py-2.5 border-2 border-dashed border-stone-200 rounded-xl text-sm text-stone-400 hover:border-stone-300 hover:text-stone-500 transition mb-4">+ Add Row</button>
              <div className="flex gap-3 pb-4">
                <button onClick={saveAllRows} disabled={validCount === 0 || batchSaving} className={cn("flex-1 py-3 font-medium rounded-xl transition", batchDone ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800", (validCount === 0 || batchSaving) && "opacity-40 cursor-not-allowed")}>
                  {batchDone ? `✓ Saved ${savedCount}` : batchSaving ? "Saving..." : `Save ${validCount} Transaction${validCount !== 1 ? "s" : ""}`}
                </button>
                {savedCount > 0 && (
                  <button onClick={clearSaved} className="px-4 py-3 text-stone-500 bg-stone-100 font-medium rounded-xl hover:bg-stone-200 transition text-sm">Clear Saved</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ Desktop Sidebar ═══ */}
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-4 space-y-4">
            {/* Session Log */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">This Session</h2>
                {sessionEntries.length > 0 && (
                  <span className={cn("text-xs font-mono font-medium", sessionTotal < 0 ? "text-red-500" : "text-emerald-600")}>
                    {sessionTotal < 0 ? "−" : "+"}${Math.abs(sessionTotal).toFixed(2)}
                  </span>
                )}
              </div>
              {sessionEntries.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-stone-400">
                  Transactions you save will appear here
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-stone-50">
                  {sessionEntries.map((e, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-stone-800 truncate">{e.description}</p>
                        <p className="text-[11px] text-stone-400">{e.category} · {e.time}</p>
                      </div>
                      <span className={cn("text-sm font-mono shrink-0", e.amount < 0 ? "text-stone-700" : "text-emerald-600")}>
                        {e.amount < 0 ? "−" : "+"}${Math.abs(e.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100">
                <h2 className="text-sm font-semibold text-stone-700">Recent Transactions</h2>
              </div>
              <div className="max-h-[calc(100vh-26rem)] overflow-y-auto divide-y divide-stone-50">
                {recentTxns.map((tx) => (
                  <div key={tx.id} className="px-4 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-stone-700 truncate">{tx.description}</p>
                      <p className="text-[11px] text-stone-400">
                        {tx.subcategory?.category?.icon} {tx.subcategory?.name} · {new Date(tx.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={cn("text-sm font-mono shrink-0", tx.amount < 0 ? "text-stone-600" : "text-emerald-600")}>
                      {tx.amount < 0 ? "−" : "+"}${Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e7e5e4;
          border-radius: 10px;
          font-size: 15px;
          color: #1c1917;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .input-field::placeholder { color: #a8a29e; }
        .input-sm {
          width: 100%;
          padding: 7px 10px;
          background: #fafaf9;
          border: 1px solid #e7e5e4;
          border-radius: 8px;
          font-size: 13px;
          color: #1c1917;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-sm:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: white;
        }
        .input-sm::placeholder { color: #a8a29e; }
      `}</style>
    </AppShell>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
        {label}
        {optional && <span className="text-stone-300 normal-case tracking-normal ml-1">optional</span>}
      </label>
      {children}
    </div>
  );
}

function AutofillDropdown({ items, onSelect }: { items: AutofillSuggestion[]; onSelect: (s: AutofillSuggestion) => void }) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-20 overflow-hidden">
      {items.map((s, i) => (
        <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); onSelect(s); }} className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between border-b border-stone-100 last:border-0 transition">
          <div>
            <p className="text-sm text-stone-900">{s.description}</p>
            {s.location && <p className="text-xs text-stone-400">{s.location}</p>}
          </div>
          <span className="text-sm font-mono text-stone-500">${Math.abs(s.amount).toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}

function CategorySelect({ value, onChange, grouped, small }: { value: number | null; onChange: (v: number | null) => void; grouped: { category: any; items: any[] }[]; small?: boolean }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={cn(
        small ? "input-sm" : "input-field",
        "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%2378716c%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.22%208.22a.75.75%200%200%201%201.06%200L10%2011.94l3.72-3.72a.75.75%200%201%201%201.06%201.06l-4.25%204.25a.75.75%200%200%201-1.06%200L5.22%209.28a.75.75%200%200%201%200-1.06Z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10",
        !value && "text-stone-400"
      )}
    >
      <option value="">Category...</option>
      {grouped.map((g) => (
        <optgroup key={g.category.id} label={`${g.category.icon} ${g.category.name}`}>
          {g.items.map((sub: any) => (
            <option key={sub.id} value={sub.id}>{sub.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
