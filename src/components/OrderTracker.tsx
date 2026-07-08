import React from "react";
import { Order, MenuItem } from "../types.ts";
import { Clock, CheckCircle2, Utensils, Sparkles, MessageSquare, Star, PlusCircle, ArrowLeft, Edit2, Receipt, Lock } from "lucide-react";
import { motion } from "motion/react";

interface OrderTrackerProps {
  order: Order;
  onAddMore: () => void;
  onEditOrder: () => void;
  onRequestBill: () => Promise<void>;
  billRequestLoading: boolean;
  // Feedback props
  feedbackSubmitted: boolean;
  onSubmitFeedback: (rating: number, comment: string, customerName: string) => Promise<void>;
  feedbackLoading: boolean;
  onTriggerAnimation?: () => void;
}

export default function OrderTracker({
  order,
  onAddMore,
  onEditOrder,
  onRequestBill,
  billRequestLoading,
  feedbackSubmitted,
  onSubmitFeedback,
  feedbackLoading,
  onTriggerAnimation,
}: OrderTrackerProps) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitFeedback(rating, comment, customerName);
  };

  // Define steps
  const steps = [
    { key: "pending", label: "Received", desc: "Order sent to kitchen" },
    { key: "preparing", label: "Preparing", desc: "Chef is cooking your dish" },
    { key: "ready", label: "Ready", desc: "Fresh & ready for you" },
  ];

  // Map status to current step index
  const getStepIndex = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return 0;
      case "preparing":
        return 1;
      case "ready":
      case "completed":
        return 2;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div id="order-tracker-container" className="max-w-md mx-auto space-y-6">
      {/* Tracker Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden"
      >
        {/* Glow ornament */}
        <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Active Order #{order.id}</h3>
              <p className="text-[10px] text-slate-400">
                Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 capitalize">
            {order.status === "completed" ? "Delivered" : order.status}
          </span>
        </div>

        {order.tokenNumber && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Your Calling Token Number</p>
            <p className="text-3xl font-black text-amber-500 mt-1">#{order.tokenNumber}</p>
            <p className="text-[10px] text-slate-400 mt-1">Please wait for the kitchen to call your token number!</p>
          </div>
        )}

        {/* Live Stepper component */}
        <div className="relative flex justify-between items-center px-4 mb-6">
          {/* Stepper Progress bar */}
          <div className="absolute top-4 left-10 right-10 h-0.5 bg-slate-800 z-0">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{
                width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps */}
          {steps.map((s, index) => {
            const isCompleted = index < currentStepIdx;
            const isActive = index === currentStepIdx;
            const isUpcoming = index > currentStepIdx;

            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                    isActive
                      ? "bg-amber-500 border-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/20"
                      : isCompleted
                      ? "bg-slate-800 border-amber-500 text-amber-400"
                      : "bg-slate-950 border-slate-850 text-slate-600"
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full border border-amber-400 animate-ping opacity-60" />
                  )}
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>

                <span
                  className={`mt-2.5 text-[11px] font-bold tracking-tight text-center ${
                    isActive ? "text-amber-400" : isCompleted ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight hidden xs:block">
                  {s.desc}
                </span>
              </div>
            );
          })}
        </div>

        {/* Play/Replay Delivery Animation Trigger if order is ready (on the way) */}
        {order.status === "ready" && onTriggerAnimation && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onTriggerAnimation}
            className="w-full mt-2 mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 py-2.5 px-4 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 active:scale-98 transition-all cursor-pointer shadow-sm shadow-amber-500/5"
          >
            <span>🚀 Tap to Track Food on the Way! 🛵</span>
          </motion.button>
        )}

        {/* List of Ordered Items */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Ordered Items</p>
          {order.items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-xs bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 truncate">{item.name}</span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold shrink-0">
                    x{item.quantity}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-1">
                    “{item.notes}”
                  </p>
                )}
              </div>
              <span className="font-mono text-slate-300 font-bold shrink-0">
                ₹{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Total Pricing info */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-800/80 text-sm">
          <span className="text-slate-400 font-medium">Order Total</span>
          <span className="font-mono font-bold text-lg text-amber-400">
            ₹{order.totalPrice.toFixed(2)}
          </span>
        </div>
      </motion.div>

      {/* Edit Order button (allowed during pending or preparing) */}
      {(order.status === "pending" || order.status === "preparing") && (
        <button
          id="btn-edit-order"
          onClick={onEditOrder}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
        >
          <Edit2 className="w-4 h-4" />
          <span>Edit Order Items</span>
        </button>
      )}

      {/* Primary Action: Go back to menu to add more items */}
      {order.billRequested ? (
        <div className="w-full p-4.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-center text-xs shadow-sm">
          <div className="flex items-center gap-2 font-extrabold text-rose-950">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Ordering Locked (Bill Requested)</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            For security, please <strong>re-scan the QR code</strong> on your table to unlock ordering and start a new session.
          </p>
        </div>
      ) : (
        <button
          onClick={onAddMore}
          className="w-full py-3.5 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4 text-amber-600" />
          <span>Add more items to order</span>
        </button>
      )}

      {/* Request Bill Button */}
      {order.status !== "completed" && (
        <div className="pt-2">
          {order.billRequested ? (
            <div className="w-full py-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Bill Requested (Staff will assist shortly)</span>
            </div>
          ) : (
            <button
              id="btn-request-bill"
              onClick={onRequestBill}
              disabled={billRequestLoading}
              className="w-full py-4.5 md:py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-base md:text-xs rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-55"
            >
              {billRequestLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                  <span>Requesting Bill...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-5 h-5 md:w-4 h-4" />
                  <span>Request Bill & Receipt</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Optional Feedback form inside tracker if completed or ready */}
      {(order.status === "ready" || order.status === "completed") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl border border-slate-150 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 md:w-4 h-4" />
            </div>
            <h4 className="text-sm md:text-xs font-bold uppercase tracking-wider text-slate-900">
              Rate your dining experience
            </h4>
          </div>

           {feedbackSubmitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-xs font-medium text-emerald-800">
              ✨ Thank you! Your feedback has been received. Have a great day!
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-sm md:text-xs mr-1">Your Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-amber-400 hover:scale-110 active:scale-90 p-1 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 md:w-5.5 md:h-5.5 transition-colors ${
                        rating >= star ? "fill-amber-400 text-amber-400" : "text-slate-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-amber-400 rounded-2xl px-4 py-3 md:p-3 text-base md:text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400/25 transition-all"
                />
              </div>
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the coffee and the food? Let us know!"
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-amber-400 rounded-2xl p-4 md:p-3 text-base md:text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400/25 transition-all"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={feedbackLoading}
                className="w-full py-4.5 md:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-base md:text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {feedbackLoading ? "Submitting Review..." : "Submit Review"}
              </button>
            </form>
          )}
        </motion.div>
      )}
    </div>
  );
}
