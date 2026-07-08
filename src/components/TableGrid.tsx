import React, { useState, useEffect } from "react";
import { Table, Order, MenuItem } from "../types.ts";
import { Users, ClipboardList, X, AlertCircle, Coffee, Check, Play, CheckCircle2, Minus, Plus, Trash2, Edit, Save, RotateCcw, QrCode, Printer } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api.ts";

interface TableGridProps {
  tables: Table[];
  orders: Order[];
  onTableStatusChange: (tableId: number, status: Table["status"]) => void;
  onUpdateOrderStatus?: (orderId: number, status: Order["status"]) => void;
  onShowQrCode?: (table: Table) => void;
  onPrintOrderBill?: (order: Order) => void;
  publicUrl?: string;
}

export const TableGrid: React.FC<TableGridProps> = ({
  tables,
  orders,
  onTableStatusChange,
  onUpdateOrderStatus,
  onShowQrCode,
  onPrintOrderBill,
  publicUrl,
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const getActiveBaseUrl = () => {
    if (publicUrl) return publicUrl;
    const stored = localStorage.getItem("cafe_public_url");
    if (stored) return stored;
    const origin = window.location.origin;
    if (origin.includes("ais-dev-")) {
      return origin.replace("ais-dev-", "ais-pre-");
    }
    return origin;
  };
  const activeBaseUrl = getActiveBaseUrl();

  // States for owner edit order flow
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editingItems, setEditingItems] = useState<Array<{ menuItemId: number; name: string; quantity: number; notes: string; unitPrice: number }>>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicMenu().then(setMenuItemsList).catch(console.error);
  }, []);

  const startEditing = (order: Order) => {
    if (order.status === "ready" || order.status === "completed") {
      alert("Cannot edit an order that is already ready or completed!");
      return;
    }
    setEditingOrderId(order.id);
    setEditError(null);
    setEditingItems(
      order.items?.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes || "",
        unitPrice: item.unitPrice,
      })) || []
    );
  };

  const updateEditQty = (menuItemId: number, change: number) => {
    setEditingItems((prev) =>
      prev
        .map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateEditNotes = (menuItemId: number, notes: string) => {
    setEditingItems((prev) =>
      prev.map((item) =>
        item.menuItemId === menuItemId ? { ...item, notes } : item
      )
    );
  };

  const handleAddItemToEdit = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const mId = Number(val);
    const itemToAdd = menuItemsList.find((m) => m.id === mId);
    if (!itemToAdd) return;

    const exists = editingItems.find((i) => i.menuItemId === mId);
    if (exists) {
      updateEditQty(mId, 1);
    } else {
      setEditingItems((prev) => [
        ...prev,
        {
          menuItemId: mId,
          name: itemToAdd.name,
          quantity: 1,
          notes: "",
          unitPrice: itemToAdd.price,
        },
      ]);
    }
    e.target.value = "";
  };

  const saveOrderEdits = async (orderId: number) => {
    if (editingItems.length === 0) {
      setEditError("Order must contain at least one item.");
      return;
    }
    setIsSavingOrder(true);
    setEditError(null);
    try {
      await api.patchOrderItems(orderId, editingItems);
      setEditingOrderId(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to save changes. The order may be locked.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Find active orders for the selected table
  const activeOrdersForTable = selectedTable
    ? orders.filter((o) => o.tableId === selectedTable.id && o.status !== "completed")
    : [];

  const handleStatusChange = async (tableId: number, status: Table["status"], e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening drawer
    try {
      await api.updateTable(tableId, { status });
      onTableStatusChange(tableId, status);
      if (selectedTable && selectedTable.id === tableId) {
        setSelectedTable((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error("Failed to update table status:", error);
    }
  };

  return (
    <div className="space-y-6 font-sans relative">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Table Layout</h2>
        <p className="text-slate-500 text-xs mt-1">Real-time occupancy status and active orders overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map((table) => {
          const activeOrders = orders.filter((o) => o.tableId === table.id && o.status !== "completed");
          const activeCount = activeOrders.length;

          // Status colors
          let statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
          if (table.status === "occupied") {
            statusBg = "bg-red-50 text-red-700 border-red-100";
          } else if (table.status === "reserved") {
            statusBg = "bg-amber-50 text-amber-700 border-amber-100";
          }

          return (
            <motion.div
              key={table.id}
              onClick={() => setSelectedTable(table)}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              id={`table-card-${table.id}`}
              className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">Table ID: {table.id}</span>
                    {onShowQrCode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowQrCode(table);
                        }}
                        title="View Table QR Code"
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mt-0.5 truncate flex items-center gap-2">
                    <span>{table.label}</span>
                    {activeOrders.some(o => o.billRequested) && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[7px] font-black uppercase tracking-wider animate-pulse inline-flex items-center shadow-sm shrink-0">
                        🧾 BILL REQ
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mt-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Up to {table.capacity} seats</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusBg}`}>
                  {table.status}
                </span>
              </div>

              {/* Quick stats and status switch */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold">
                  <ClipboardList className={`w-4 h-4 ${activeCount > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
                  <span>{activeCount} active {activeCount === 1 ? "order" : "orders"}</span>
                </div>

                {/* Switch quick actions */}
                <div className="flex gap-1">
                  <button
                    onClick={(e) => handleStatusChange(table.id, "available", e)}
                    title="Set available"
                    className={`w-5 h-5 rounded-full bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 flex items-center justify-center text-[9px] font-bold text-emerald-800 transition-transform hover:scale-110 ${table.status === "available" ? "ring-2 ring-emerald-500 ring-offset-1" : ""}`}
                  >
                    A
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(table.id, "occupied", e)}
                    title="Set occupied"
                    className={`w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 border border-red-300 flex items-center justify-center text-[9px] font-bold text-red-800 transition-transform hover:scale-110 ${table.status === "occupied" ? "ring-2 ring-red-500 ring-offset-1" : ""}`}
                  >
                    O
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(table.id, "reserved", e)}
                    title="Set reserved"
                    className={`w-5 h-5 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center text-[9px] font-bold text-amber-800 transition-transform hover:scale-110 ${table.status === "reserved" ? "ring-2 ring-amber-500 ring-offset-1" : ""}`}
                  >
                    R
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Drawer for Selected Table Active Orders */}
      <AnimatePresence>
        {selectedTable && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTable(null)}
              className="fixed inset-0 bg-slate-950 z-40 backdrop-blur-xs"
            />

            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 150 }}
              id="active-order-drawer"
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 border-l border-slate-100 flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="font-bold text-base tracking-tight">{selectedTable.label}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">Seating capacity: {selectedTable.capacity} • Status: <span className="capitalize font-bold">{selectedTable.status}</span></p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* QR Code Section inside Drawer */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-slate-700" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Table QR Code</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Scan to Order</span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100">
                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                          `${activeBaseUrl}?table=${selectedTable.id}`
                        )}`}
                        alt="Table QR Code"
                        className="w-16 h-16"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                        Guests can scan this code with their phones to access the menu and place orders.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (onShowQrCode) onShowQrCode(selectedTable);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-white font-bold text-[10px] rounded-md transition-all cursor-pointer select-none"
                        >
                          Print / Large
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${activeBaseUrl}?table=${selectedTable.id}`);
                            alert(`Copied ordering link to clipboard for ${selectedTable.label}!`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-md border border-slate-200 transition-all cursor-pointer select-none"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedTable.label.toLowerCase().includes("parcel") && (() => {
                    const activeOrders = orders.filter((o) => o.tableId === selectedTable.id && o.status !== "completed");
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-250/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-wider">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                          </span>
                          Active Parcel Tokens for Calling:
                        </div>
                        {activeOrders.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">No active parcel orders currently.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5">
                            {activeOrders.map((order) => {
                              const handleCallTokenVoice = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!order.tokenNumber) return;
                                const utterance = new SpeechSynthesisUtterance(
                                  `Token number ${order.tokenNumber}, please collect your parcel!`
                                );
                                utterance.lang = "en-IN";
                                window.speechSynthesis.speak(utterance);
                              };
                              return (
                                <div key={order.id} className="flex items-center justify-between bg-white border border-slate-100 px-2.5 py-1.5 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      #{order.tokenNumber || order.id}
                                    </span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                      order.status === "ready" 
                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                        : "bg-amber-50 text-amber-600 border border-amber-100"
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleCallTokenVoice}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-[8px] rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                                    </svg>
                                    Call Token
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Order Details</h4>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold">
                    {activeOrdersForTable.length} Open {activeOrdersForTable.length === 1 ? "Order" : "Orders"}
                  </span>
                </div>

                {activeOrdersForTable.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center p-4">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No active orders</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">This table has no pending, preparing, or ready orders right now.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeOrdersForTable.map((order) => {
                      const isEditing = editingOrderId === order.id;
                      const isModifiable = order.status === "pending" || order.status === "preparing";

                      return (
                        <div key={order.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-400 font-bold">Ticket ID: #{order.id}</span>
                                {order.tokenNumber && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-extrabold">
                                    Token #{order.tokenNumber}
                                  </span>
                                )}
                                {order.billRequested && (
                                  <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[8px] font-bold uppercase tracking-wider animate-pulse">
                                    Bill Requested
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Ordered {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              order.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : order.status === "preparing"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {order.status}
                            </span>
                          </div>

                          {isEditing ? (
                            /* Owner Order Item Editor View */
                            <div className="space-y-4 pt-3 border-t border-slate-150">
                              <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Modify Order Items</h5>
                              
                              {editError && (
                                <div className="p-2.5 bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold rounded-xl">
                                  {editError}
                                </div>
                              )}

                              <div className="space-y-3">
                                {editingItems.map((item) => (
                                  <div key={item.menuItemId} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-slate-800">{item.name}</span>
                                      <div className="flex items-center gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() => updateEditQty(item.menuItemId, -1)}
                                          className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-250 flex items-center justify-center text-slate-600 cursor-pointer"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="font-mono font-bold text-slate-900">{item.quantity}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateEditQty(item.menuItemId, 1)}
                                          className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-250 flex items-center justify-center text-slate-600 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <input
                                      type="text"
                                      value={item.notes}
                                      onChange={(e) => updateEditNotes(item.menuItemId, e.target.value)}
                                      placeholder="Chef instructions/notes..."
                                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg px-2.5 py-1 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400/25 transition-all"
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* Add New Item Dropdown */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Add menu item</label>
                                <select
                                  onChange={handleAddItemToEdit}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                                >
                                  <option value="">-- Choose item to add --</option>
                                  {menuItemsList.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} (₹{m.price.toFixed(2)})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Save/Cancel Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingOrderId(null)}
                                  disabled={isSavingOrder}
                                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveOrderEdits(order.id)}
                                  disabled={isSavingOrder}
                                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingOrder ? (
                                    <>
                                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3.5 h-3.5" />
                                      Save Edits
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Standard Static Items View */
                            <>
                              <div className="space-y-3 pt-3 border-t border-slate-100">
                                {order.items?.map((item) => (
                                  <div key={item.id} className="flex justify-between items-start text-xs">
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-slate-800">{item.name}</p>
                                      {item.notes && (
                                        <p className="text-[10px] text-amber-700 italic font-medium">“{item.notes}”</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono text-slate-500">x{item.quantity}</span>
                                      <p className="font-mono text-slate-400 text-[10px]">₹{item.unitPrice.toFixed(2)} ea</p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="pt-3 border-t border-slate-150 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-500">Subtotal</span>
                                <span className="font-mono font-bold text-slate-900">₹{order.totalPrice.toFixed(2)}</span>
                              </div>

                              {/* Edit items on Owner side */}
                              {isModifiable && (
                                <button
                                  type="button"
                                  onClick={() => startEditing(order)}
                                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit Order Items
                                </button>
                              )}

                              {onPrintOrderBill && (
                                <button
                                  type="button"
                                  onClick={() => onPrintOrderBill(order)}
                                  className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 hover:border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-2"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-600" />
                                  Print Physical Bill Slip
                                </button>
                              )}
                            </>
                          )}

                          {onUpdateOrderStatus && (
                            <div className="pt-2 space-y-2">
                              {order.status === "pending" && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, "preparing")}
                                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-slate-950 text-slate-950" />
                                  Start Cooking (Approve)
                                </button>
                              )}
                              {order.status === "preparing" && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, "ready")}
                                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Mark Ready
                                </button>
                              )}
                              {order.status === "ready" && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, "completed")}
                                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  Serve & Archive Order
                                </button>
                              )}

                              {/* Prominent "Close Table" Button */}
                              {order.status !== "completed" && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, "completed")}
                                  className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Close Table (Clear Order)</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors text-center"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
