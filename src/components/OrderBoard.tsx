import React, { useState, useEffect } from "react";
import { Order, OrderItem } from "../types.ts";
import { Clock, Play, CheckCircle2, Check, ArrowRight, ClipboardList, Utensils, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OrderBoardProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: number, status: Order["status"]) => void;
  alertSoundType?: "standard" | "loud" | "muted";
  onCycleSound?: () => void;
  onPlayTestSound?: () => void;
}

// Live timer card to show exact time elapsed since order submission
const OrderCard: React.FC<{
  order: Order;
  onNextStatus: (orderId: number) => void;
}> = ({ order, onNextStatus }) => {
  const [elapsed, setElapsed] = useState<string>("Just now");

  useEffect(() => {
    const calculateElapsed = () => {
      const createdAt = new Date(order.createdAt).getTime();
      const diffMs = Date.now() - createdAt;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setElapsed("Just now");
      } else if (diffMins < 60) {
        setElapsed(`${diffMins}m ago`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setElapsed(`${hours}h ${mins}m ago`);
      }
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 15000); // refresh every 15s
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const handleCallVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!order.tokenNumber) return;
    const utterance = new SpeechSynthesisUtterance(
      `Token number ${order.tokenNumber}, please collect your order!`
    );
    utterance.lang = "en-IN"; // Indian accent English for local cafe
    window.speechSynthesis.speak(utterance);
  };

  const getActionDetails = () => {
    switch (order.status) {
      case "pending":
        return {
          label: "Approve & Cook",
          icon: <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />,
          color: "bg-amber-500 hover:bg-amber-600 text-slate-950",
        };
      case "preparing":
        return {
          label: "Mark Ready",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          color: "bg-blue-500 hover:bg-blue-600 text-white",
        };
      case "ready":
        return {
          label: "Serve & Archive",
          icon: <Check className="w-3.5 h-3.5" />,
          color: "bg-emerald-500 hover:bg-emerald-600 text-white",
        };
      default:
        return null;
    }
  };

  const action = getActionDetails();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      id={`order-card-${order.id}`}
      className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow space-y-4"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {order.tableLabel}
            </span>
            {order.tokenNumber && (
              <span className="text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                Token #{order.tokenNumber}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400 block">Ticket: #{order.id}</span>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{elapsed}</span>
          </div>
          {order.tokenNumber && (
            <button
              onClick={handleCallVoice}
              title="Voice Call Customer Token"
              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs select-none"
            >
              <Volume2 className="w-3 h-3" />
              <span>Call Token</span>
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs">
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between text-slate-700">
            <span className="flex-1 pr-2">
              <span className="font-bold text-slate-950">{item.name}</span>
              {item.notes && (
                <p className="text-[10px] text-amber-700 italic mt-0.5 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100/50 w-fit">
                  “{item.notes}”
                </p>
              )}
            </span>
            <span className="font-mono text-slate-500 shrink-0 font-semibold">x{item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Footer / Move Column Action */}
      <div className="flex justify-between items-center pt-1">
        <div>
          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Price</p>
          <span className="font-mono font-bold text-slate-900 text-sm">₹{order.totalPrice.toFixed(2)}</span>
        </div>

        {action && (
          <button
            onClick={() => onNextStatus(order.id)}
            className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm ${action.color}`}
          >
            <span>{action.label}</span>
            {action.icon}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const OrderBoard: React.FC<OrderBoardProps> = ({ 
  orders, 
  onUpdateOrderStatus,
  alertSoundType = "loud",
  onCycleSound,
  onPlayTestSound
}) => {
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const handleNextStatus = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    let nextStatus: Order["status"];
    if (order.status === "pending") {
      nextStatus = "preparing";
    } else if (order.status === "preparing") {
      nextStatus = "ready";
    } else if (order.status === "ready") {
      nextStatus = "completed";
    } else {
      return;
    }

    onUpdateOrderStatus(orderId, nextStatus);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Live Orders Pipeline</h2>
          <p className="text-slate-500 text-xs mt-1">
            Drag-and-click orders through the kitchen preparation pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Live alert audio active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMN 1: PENDING */}
        <div id="col-pending" className="bg-slate-50 rounded-2xl border border-slate-150 p-4.5 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Approval</span>
            <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg text-xs font-bold">
              {pendingOrders.length}
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[70vh] min-h-[40vh] pr-1">
            <AnimatePresence mode="popLayout">
              {pendingOrders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-slate-400 py-16"
                >
                  No pending tickets
                </motion.p>
              ) : (
                pendingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onNextStatus={handleNextStatus} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div id="col-preparing" className="bg-slate-50 rounded-2xl border border-slate-150 p-4.5 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">In the Kitchen</span>
            <span className="font-mono bg-blue-100 text-blue-950 px-2 py-0.5 rounded-lg text-xs font-bold">
              {preparingOrders.length}
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[70vh] min-h-[40vh] pr-1">
            <AnimatePresence mode="popLayout">
              {preparingOrders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-slate-400 py-16"
                >
                  Kitchen is empty
                </motion.p>
              ) : (
                preparingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onNextStatus={handleNextStatus} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUMN 3: READY */}
        <div id="col-ready" className="bg-slate-50 rounded-2xl border border-slate-150 p-4.5 flex flex-col space-y-4">
          <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Ready to Serve</span>
            <span className="font-mono bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-lg text-xs font-bold">
              {readyOrders.length}
            </span>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[70vh] min-h-[40vh] pr-1">
            <AnimatePresence mode="popLayout">
              {readyOrders.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-slate-400 py-16"
                >
                  No orders ready
                </motion.p>
              ) : (
                readyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onNextStatus={handleNextStatus} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
