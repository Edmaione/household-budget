"use client";

import { useState, useMemo } from "react";
import AppShell from "@/components/AppShell";
import {
  useManageCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Category, Subcategory } from "@/lib/types";

export default function SettingsPage() {
  const { categories, subcategories, loading, refresh } = useManageCategories();

  // Expand / collapse
  const [expandedCatId, setExpandedCatId] = useState<number | null>(null);

  // Editing
  const [editingCat, setEditingCat] = useState<{ id: number; name: string; icon: string } | null>(null);
  const [editingSubcat, setEditingSubcat] = useState<{ id: number; name: string } | null>(null);

  // Adding
  const [addingCatType, setAddingCatType] = useState<"expense" | "income" | null>(null);
  const [newCat, setNewCat] = useState({ icon: "", name: "" });
  const [addingSubcatForCatId, setAddingSubcatForCatId] = useState<number | null>(null);
  const [newSubcatName, setNewSubcatName] = useState("");

  // Deleting
  const [confirmDelete, setConfirmDelete] = useState<{ type: "cat" | "subcat"; id: number } | null>(null);

  const incomeCats = useMemo(() => categories.filter((c) => c.type === "income").sort((a, b) => a.sort_order - b.sort_order), [categories]);
  const expenseCats = useMemo(() => categories.filter((c) => c.type === "expense").sort((a, b) => a.sort_order - b.sort_order), [categories]);

  function subcatsFor(catId: number) {
    return subcategories.filter((s) => s.category_id === catId).sort((a, b) => a.sort_order - b.sort_order);
  }

  // ── Category CRUD ──

  async function handleAddCategory(type: "expense" | "income") {
    if (!newCat.name.trim()) return;
    const maxSort = categories.filter((c) => c.type === type).reduce((m, c) => Math.max(m, c.sort_order), 0);
    await createCategory({
      name: newCat.name.trim(),
      type,
      icon: newCat.icon || (type === "income" ? "💰" : "📦"),
      sort_order: maxSort + 1,
    });
    setNewCat({ icon: "", name: "" });
    setAddingCatType(null);
    await refresh();
  }

  async function handleSaveCategory() {
    if (!editingCat || !editingCat.name.trim()) return;
    await updateCategory(editingCat.id, { name: editingCat.name.trim(), icon: editingCat.icon });
    setEditingCat(null);
    await refresh();
  }

  async function handleDeleteCategory(id: number) {
    const subs = subcatsFor(id);
    if (subs.length > 0) return; // shouldn't happen — UI blocks this
    await deleteCategory(id);
    setConfirmDelete(null);
    if (expandedCatId === id) setExpandedCatId(null);
    await refresh();
  }

  // ── Subcategory CRUD ──

  async function handleAddSubcategory(catId: number) {
    if (!newSubcatName.trim()) return;
    const subs = subcatsFor(catId);
    const maxSort = subs.reduce((m, s) => Math.max(m, s.sort_order), 0);
    await createSubcategory({ name: newSubcatName.trim(), category_id: catId, sort_order: maxSort + 1 });
    setNewSubcatName("");
    setAddingSubcatForCatId(null);
    await refresh();
  }

  async function handleSaveSubcategory() {
    if (!editingSubcat || !editingSubcat.name.trim()) return;
    await updateSubcategory(editingSubcat.id, { name: editingSubcat.name.trim() });
    setEditingSubcat(null);
    await refresh();
  }

  async function handleDeleteSubcategory(id: number) {
    await deleteSubcategory(id);
    setConfirmDelete(null);
    await refresh();
  }

  // ── Render helpers ──

  function renderCategorySection(type: "income" | "expense", cats: Category[]) {
    const label = type === "income" ? "Income" : "Expenses";
    return (
      <div className="mb-6">
        <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">{label}</h2>
        <div className="space-y-2">
          {cats.map((cat) => {
            const subs = subcatsFor(cat.id);
            const isExpanded = expandedCatId === cat.id;
            const isEditing = editingCat?.id === cat.id;
            const isConfirmingDelete = confirmDelete?.type === "cat" && confirmDelete.id === cat.id;

            return (
              <div key={cat.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCat.icon}
                        onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })}
                        className="w-10 text-center text-lg bg-stone-50 border border-stone-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="🏠"
                      />
                      <input
                        type="text"
                        value={editingCat.name}
                        onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategory(); if (e.key === "Escape") setEditingCat(null); }}
                        className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        autoFocus
                      />
                      <button onClick={handleSaveCategory} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1">Save</button>
                      <button onClick={() => setEditingCat(null)} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <span className="text-lg leading-none">{cat.icon}</span>
                        <span className="text-sm font-medium text-stone-900 truncate">{cat.name}</span>
                        <span className="text-[10px] text-stone-400">{subs.length} sub</span>
                        <svg className={cn("w-4 h-4 text-stone-300 transition-transform ml-auto shrink-0", isExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingCat({ id: cat.id, name: cat.name, icon: cat.icon })}
                          className="p-1.5 text-stone-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: "cat", id: cat.id })}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Delete confirmation */}
                {isConfirmingDelete && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
                    {subs.length > 0 ? (
                      <>
                        <p className="text-xs text-red-600">Delete {subs.length} subcategories first</p>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1">OK</button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-red-600">Delete &ldquo;{cat.name}&rdquo;?</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1">Delete</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1">Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-stone-100 bg-stone-50/50 divide-y divide-stone-100">
                    {subs.map((sub) => {
                      const isEditingSub = editingSubcat?.id === sub.id;
                      const isConfirmingSubDelete = confirmDelete?.type === "subcat" && confirmDelete.id === sub.id;

                      return (
                        <div key={sub.id}>
                          <div className="flex items-center gap-2 pl-12 pr-4 py-2">
                            {isEditingSub ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingSubcat.name}
                                  onChange={(e) => setEditingSubcat({ ...editingSubcat, name: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveSubcategory(); if (e.key === "Escape") setEditingSubcat(null); }}
                                  onBlur={handleSaveSubcategory}
                                  className="flex-1 text-xs bg-white border border-stone-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-xs text-stone-700">{sub.name}</span>
                                <button
                                  onClick={() => setEditingSubcat({ id: sub.id, name: sub.name })}
                                  className="p-1 text-stone-300 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ type: "subcat", id: sub.id })}
                                  className="p-1 text-stone-300 hover:text-red-600 rounded hover:bg-red-50 transition"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                          {isConfirmingSubDelete && (
                            <div className="pl-12 pr-4 py-2 bg-red-50/50 flex items-center justify-between">
                              <p className="text-[11px] text-red-600">Delete &ldquo;{sub.name}&rdquo;?</p>
                              <div className="flex gap-2">
                                <button onClick={() => handleDeleteSubcategory(sub.id)} className="text-[11px] font-medium text-red-600 hover:text-red-700 px-2 py-0.5">Delete</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-stone-500 hover:text-stone-700 px-2 py-0.5">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add subcategory */}
                    {addingSubcatForCatId === cat.id ? (
                      <div className="pl-12 pr-4 py-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={newSubcatName}
                          onChange={(e) => setNewSubcatName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddSubcategory(cat.id); if (e.key === "Escape") { setAddingSubcatForCatId(null); setNewSubcatName(""); } }}
                          placeholder="Subcategory name"
                          className="flex-1 text-xs bg-white border border-stone-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          autoFocus
                        />
                        <button onClick={() => handleAddSubcategory(cat.id)} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1">Add</button>
                        <button onClick={() => { setAddingSubcatForCatId(null); setNewSubcatName(""); }} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingSubcatForCatId(cat.id); setNewSubcatName(""); }}
                        className="w-full pl-12 pr-4 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 text-left transition"
                      >
                        + Add Subcategory
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add category */}
          {addingCatType === type ? (
            <div className="bg-white rounded-xl border border-stone-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCat.icon}
                  onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                  placeholder="🏷"
                  className="w-10 text-center text-lg bg-stone-50 border border-stone-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(type); if (e.key === "Escape") { setAddingCatType(null); setNewCat({ icon: "", name: "" }); } }}
                  placeholder="Category name"
                  className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  autoFocus
                />
                <button onClick={() => handleAddCategory(type)} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5">Add</button>
                <button onClick={() => { setAddingCatType(null); setNewCat({ icon: "", name: "" }); }} className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1.5">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingCatType(type); setNewCat({ icon: "", name: "" }); }}
              className="w-full py-2.5 text-sm text-blue-600 hover:text-blue-700 font-medium rounded-xl border border-dashed border-stone-300 hover:border-blue-400 hover:bg-blue-50/50 transition"
            >
              + Add {label === "Income" ? "Income" : "Expense"} Category
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="px-4 pt-6">
        <h1 className="text-lg font-semibold text-stone-900 mb-1">Settings</h1>
        <p className="text-sm text-stone-400 mb-5">Manage categories and subcategories</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {renderCategorySection("income", incomeCats)}
            {renderCategorySection("expense", expenseCats)}
          </>
        )}
      </div>
    </AppShell>
  );
}
