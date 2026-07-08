import React, { useState } from "react";
import { MenuItem } from "../types.ts";
import { Plus, Edit2, Trash2, X, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api.ts";

interface MenuManagerProps {
  menu: MenuItem[];
  onMenuChange: (updatedMenu: MenuItem[]) => void;
  isReadOnly?: boolean;
}

interface MenuFormState {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  dietType: string;
  isAvailable: boolean;
}

const CATEGORIES = [
  "Appetizers", "Frites", "Bagel", "Hot Dog", "Between Breads", "Burgers", "Pizza",
  "Garlic Breads", "Pasta", "Speciality Pasta", "Stroganoff", "Spaghetti", "Chef's Special",
  "Rice Meals", "Wraps", "Sizzlers", "Add-ons", "Mocktails", "Our Speciality", "Fruit Base",
  "Shakes", "Desserts", "Other Beverages", "Winter Special"
];

export const MenuManager: React.FC<MenuManagerProps> = ({ menu, onMenuChange, isReadOnly = false }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<MenuFormState>({
    name: "",
    description: "",
    price: "",
    category: "Appetizers",
    imageUrl: "",
    dietType: "veg",
    isAvailable: true,
  });

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "Appetizers",
      imageUrl: "",
      dietType: "veg",
      isAvailable: true,
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || "",
      dietType: item.dietType || "veg",
      isAvailable: item.isAvailable,
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  // 1. OPTIMISTIC STATUS TOGGLE
  const handleToggleAvailability = async (item: MenuItem) => {
    const originalMenu = [...menu];
    const updatedStatus = !item.isAvailable;

    // Optimistic Update: update local state immediately
    const optimisticallyUpdatedMenu = menu.map((m) =>
      m.id === item.id ? { ...m, isAvailable: updatedStatus } : m
    );
    onMenuChange(optimisticallyUpdatedMenu);

    try {
      await api.putMenuItem(item.id, { isAvailable: updatedStatus });
    } catch (err) {
      console.error("Failed to toggle availability:", err);
      // Rollback on failure
      onMenuChange(originalMenu);
      alert(`Could not update availability for "${item.name}". Rolled back.`);
    }
  };

  // 2. OPTIMISTIC SOFT DELETE
  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to soft-delete "${item.name}"? It will set availability to false.`)) {
      return;
    }

    const originalMenu = [...menu];

    // Optimistic Update: Mark as unavailable locally
    const optimisticallyUpdatedMenu = menu.map((m) =>
      m.id === item.id ? { ...m, isAvailable: false } : m
    );
    onMenuChange(optimisticallyUpdatedMenu);

    try {
      await api.deleteMenuItem(item.id);
    } catch (err) {
      console.error("Failed to delete item:", err);
      // Rollback on failure
      onMenuChange(originalMenu);
      alert(`Could not delete "${item.name}". Rolled back.`);
    }
  };

  // 3. OPTIMISTIC FORM SUBMIT (ADD / EDIT)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Price must be a valid positive number");
      return;
    }

    setSubmitting(true);

    const itemData = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: priceNum,
      category: form.category,
      imageUrl: form.imageUrl.trim() || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=400&auto=format&fit=crop",
      dietType: form.dietType,
      isAvailable: form.isAvailable,
    };

    const originalMenu = [...menu];
    let tempId = Date.now(); // temp client side ID for optimistic add

    if (editingItemId) {
      // OPTIMISTIC EDIT
      const updatedItemMock: MenuItem = {
        id: editingItemId,
        ...itemData,
        createdAt: new Date().toISOString(),
      };
      onMenuChange(menu.map((m) => (m.id === editingItemId ? updatedItemMock : m)));
      setShowModal(false);

      try {
        const actualUpdated = await api.putMenuItem(editingItemId, itemData);
        // Replace with actual server response (in case of slight changes)
        onMenuChange(originalMenu.map((m) => (m.id === editingItemId ? actualUpdated : m)));
      } catch (err: any) {
        console.error("Failed to update item:", err);
        onMenuChange(originalMenu); // rollback
        alert(err.message || "Failed to edit menu item. Changes reverted.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // OPTIMISTIC ADD
      const addedItemMock: MenuItem = {
        id: tempId,
        ...itemData,
        createdAt: new Date().toISOString(),
      };
      onMenuChange([addedItemMock, ...menu]);
      setShowModal(false);

      try {
        const actualAdded = await api.addMenuItem(itemData);
        // Replace the mock item with the real persisted item from server
        onMenuChange([actualAdded, ...originalMenu]);
      } catch (err: any) {
        console.error("Failed to add item:", err);
        // Remove the mock item
        onMenuChange(originalMenu);
        alert(err.message || "Failed to create menu item. Reverted addition.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Menu Catalogue Manager</h2>
          <p className="text-slate-500 text-xs mt-1">
            Configure dishes, adjust prices, and toggle in-stock availability optimistically.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white rounded-xl cursor-pointer shadow-md transition-all shadow-slate-950/10"
          >
            <Plus className="w-4 h-4" />
            Add Menu Item
          </button>
        )}
      </div>

      {/* Table list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Dish Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Availability</th>
                {!isReadOnly && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menu.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 4 : 5} className="p-8 text-center text-slate-400 font-medium">
                    No items in menu catalog.
                  </td>
                </tr>
              ) : (
                menu.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 flex items-center gap-3 min-w-[250px]">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop"}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg shrink-0 bg-slate-100 border border-slate-100"
                      />
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1">
                          {item.name}
                          {item.id > 1000000000 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-[8px] text-amber-700 font-bold border border-amber-200 uppercase tracking-widest animate-pulse">
                              <Sparkles className="w-2 h-2" /> Syncing
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm truncate">
                          {item.description || "No description provided."}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-600 border border-slate-200/50">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border transition-all ${
                          item.isAvailable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50"
                        }`}
                      >
                        {item.isAvailable ? "In Stock" : "Sold Out"}
                      </button>
                    </td>
                    {!isReadOnly && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                            title="Soft Delete (Sold Out)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col"
            >
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  {editingItemId ? "Edit Menu Item" : "Create New Menu Item"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Vanilla Espresso, Blueberry Muffin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Category Group
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    required
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="4.50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/... (optional)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Dietary Preference
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dietType: "veg" }))}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        form.dietType === "veg"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                      Vegetarian (Veg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dietType: "non-veg" }))}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        form.dietType === "non-veg"
                          ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 bg-rose-600 inline-block [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></span>
                      Non-Vegetarian
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Description / Ingredients
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Write a brief description of taste, allergens, or preparation..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Immediate Availability</p>
                    <p className="text-[10px] text-slate-400">Show in active customer menus immediately</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
                    className="w-4.5 h-4.5 text-amber-500 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-slate-950/5 cursor-pointer flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingItemId ? "Save Changes" : "Create Item"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
