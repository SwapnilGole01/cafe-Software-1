import React, { useState, useMemo } from "react";
import { OrderHistoryRecord } from "../types.ts";
import { 
  Search, 
  Printer, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Filter, 
  ArrowUpDown, 
  Receipt,
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OrderHistoryViewProps {
  historyList: OrderHistoryRecord[];
  onReprintBill: (order: any) => void;
}

export function OrderHistoryView({ historyList, onReprintBill }: OrderHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "online">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  const toggleExpand = (orderId: number) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Parse and process items from the history list
  const processedList = useMemo(() => {
    return historyList.map((rec) => {
      let items: any[] = [];
      try {
        items = JSON.parse(rec.itemDetails);
      } catch (e) {
        console.error("Failed to parse itemDetails JSON:", e);
      }
      return {
        ...rec,
        items,
      };
    });
  }, [historyList]);

  // Filter and Search logic
  const filteredList = useMemo(() => {
    return processedList.filter((item) => {
      // 1. Payment Method Filter
      if (paymentFilter !== "all") {
        const method = item.paymentMethod || "cash";
        if (method !== paymentFilter) return false;
      }

      // 2. Search query (matches Order ID, Table Label, or Item Names)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesOrderId = item.orderId?.toString().includes(query) || item.id.toString().includes(query);
        const matchesTableLabel = item.tableLabel.toLowerCase().includes(query);
        const matchesItems = item.items.some((i: any) => i.name.toLowerCase().includes(query));

        if (!matchesOrderId && !matchesTableLabel && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [processedList, paymentFilter, searchQuery]);

  // Sorting logic
  const sortedAndFilteredList = useMemo(() => {
    const listCopy = [...filteredList];
    return listCopy.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case "newest":
          return timeB - timeA;
        case "oldest":
          return timeA - timeB;
        case "highest":
          return b.totalCost - a.totalCost;
        case "lowest":
          return a.totalCost - b.totalCost;
        default:
          return timeB - timeA;
      }
    });
  }, [filteredList, sortBy]);

  // Stats calculation for the current filtered set of items
  const stats = useMemo(() => {
    const totalCount = filteredList.length;
    const totalRevenue = filteredList.reduce((sum, item) => sum + item.totalCost, 0);
    const avgOrderValue = totalCount > 0 ? totalRevenue / totalCount : 0;
    
    const cashRevenue = filteredList
      .filter(item => (item.paymentMethod || "cash") === "cash")
      .reduce((sum, item) => sum + item.totalCost, 0);

    const onlineRevenue = filteredList
      .filter(item => item.paymentMethod === "online")
      .reduce((sum, item) => sum + item.totalCost, 0);

    return {
      totalCount,
      totalRevenue,
      avgOrderValue,
      cashRevenue,
      onlineRevenue
    };
  }, [filteredList]);

  return (
    <div className="space-y-6">
      {/* Search, Filter & Stats Panel Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Completed Order Archive</h1>
          <p className="text-slate-500 text-xs mt-1">
            Search, filter, inspect and reprint bills for all previous cafe transactions.
          </p>
        </div>
        
        {/* Sorting Controller */}
        <div className="flex items-center gap-2 self-stretch lg:self-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
          >
            <option value="newest">Newest Transaction</option>
            <option value="oldest">Oldest Transaction</option>
            <option value="highest">Value: High to Low</option>
            <option value="lowest">Value: Low to High</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Orders</div>
            <div className="text-xl font-extrabold text-slate-900">{stats.totalCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Matching current filters</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Revenue</div>
            <div className="text-xl font-extrabold text-slate-900">₹{stats.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sum of selected records</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Basket Value</div>
            <div className="text-xl font-extrabold text-slate-900">₹{stats.avgOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Per-ticket average cost</div>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Breakdown</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1" title="Cash Revenue">
                <Banknote className="w-3.5 h-3.5 text-emerald-500" /> ₹{stats.cashRevenue.toFixed(0)}
              </span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1" title="Online Revenue">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" /> ₹{stats.onlineRevenue.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search Container */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Payment Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { id: "all", label: "All Settlement Types" },
            { id: "cash", label: "Cash" },
            { id: "online", label: "Online" }
          ].map((tab) => {
            const isTabActive = paymentFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPaymentFilter(tab.id as any)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  isTabActive
                    ? "bg-white text-slate-900 shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Ticket ID, dining table, or dish name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid / List */}
      <div className="space-y-4">
        {sortedAndFilteredList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-sm">
            <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-700">No completed orders match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting your search query or choosing another settlement filter</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
            {/* Header for wide screens */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2">Order / Ticket</div>
              <div className="col-span-2">Date & Time</div>
              <div className="col-span-2">Dining Area</div>
              <div className="col-span-3">Purchased Offerings</div>
              <div className="col-span-1.5 text-center">Settled via</div>
              <div className="col-span-1 text-right">Total Cost</div>
              <div className="col-span-0.5"></div>
            </div>

            <AnimatePresence initial={false}>
              {sortedAndFilteredList.map((record) => {
                const isExpanded = expandedOrders[record.id] || false;
                return (
                  <motion.div
                    key={record.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col hover:bg-slate-50/30 transition-all"
                  >
                    {/* Primary Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center px-6 py-4.5 text-xs">
                      {/* Column 1: Order ID */}
                      <div className="col-span-2 flex items-center justify-between lg:justify-start gap-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-sm">
                            #{record.orderId || record.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref ID: {record.id}
                          </span>
                        </div>
                        <span className="lg:hidden font-mono font-black text-slate-900 text-sm bg-slate-100 px-2 py-1 rounded-lg">
                          ₹{record.totalCost.toFixed(2)}
                        </span>
                      </div>

                      {/* Column 2: Timestamp */}
                      <div className="col-span-2 text-slate-600 flex items-center gap-1.5 lg:block">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 lg:hidden" />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">
                            {new Date(record.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono lg:mt-0.5">
                            {new Date(record.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Column 3: Table Label */}
                      <div className="col-span-2 text-slate-800 font-bold">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border border-slate-200">
                          {record.tableLabel}
                        </span>
                      </div>

                      {/* Column 4: Items Preview */}
                      <div className="col-span-3 text-slate-500">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 lg:line-clamp-1">
                            {record.items.map((i: any) => `${i.name} (x${i.quantity})`).join(", ")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {record.items.reduce((sum, i) => sum + i.quantity, 0)} items in total
                          </span>
                        </div>
                      </div>

                      {/* Column 5: Payment Badge */}
                      <div className="col-span-1.5 flex justify-start lg:justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            (record.paymentMethod || "cash") === "cash"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-blue-50 text-blue-700 border-blue-100"
                          }`}
                        >
                          {(record.paymentMethod || "cash") === "cash" ? (
                            <>
                              <Banknote className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Cash settled</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Online paid</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Column 6: Cost (Wide Screen only) */}
                      <div className="col-span-1 text-right font-mono font-extrabold text-slate-900 text-sm hidden lg:block">
                        ₹{record.totalCost.toFixed(2)}
                      </div>

                      {/* Column 7: Actions */}
                      <div className="col-span-1.5 flex items-center justify-end gap-2 self-stretch lg:self-auto pt-3 lg:pt-0 border-t border-slate-100 lg:border-none">
                        <button
                          onClick={() => onReprintBill({
                            id: record.orderId,
                            tableLabel: record.tableLabel,
                            items: record.items,
                            totalPrice: record.totalCost,
                            paymentMethod: record.paymentMethod,
                            createdAt: record.createdAt
                          })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-250 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex-1 lg:flex-none justify-center shadow-sm"
                          title="Reprint Customer Bill Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span className="lg:hidden">Reprint Bill</span>
                        </button>
                        
                        <button
                          onClick={() => toggleExpand(record.id)}
                          className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 cursor-pointer transition-all flex items-center justify-center"
                          title={isExpanded ? "Collapse Details" : "Expand Details"}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Details Tray */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 overflow-hidden text-xs"
                      >
                        <div className="max-w-2xl bg-white border border-slate-150 rounded-2xl p-4 shadow-inner space-y-3">
                          <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                            <Receipt className="w-4 h-4 text-slate-400" /> 
                            Items Breakdown
                          </h4>
                          <div className="divide-y divide-slate-100">
                            {record.items.map((item: any, index: number) => (
                              <div key={index} className="py-2.5 flex justify-between items-center text-slate-700 font-medium">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-900">{item.name}</p>
                                  {item.notes && (
                                    <p className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md inline-block font-bold">
                                      Note: {item.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="text-slate-400 text-xs">
                                    {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                                  </span>
                                  <span className="font-mono font-bold text-slate-900 w-20 text-right">
                                    ₹{(item.quantity * item.unitPrice).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center text-xs">
                            <div className="text-slate-400 font-medium">
                              Subtotal ({record.items.reduce((sum, i) => sum + i.quantity, 0)} items)
                            </div>
                            <div className="font-mono font-bold text-slate-900">
                              ₹{(record.totalCost / 1.08).toFixed(2)}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs text-slate-400">
                            <div>CGST (4%) + SGST (4%)</div>
                            <div className="font-mono font-bold text-slate-900">
                              ₹{(record.totalCost - (record.totalCost / 1.08)).toFixed(2)}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm">
                            <div className="font-extrabold text-slate-900 uppercase">Grand Total</div>
                            <div className="font-mono font-black text-amber-600 text-base">
                              ₹{record.totalCost.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
