import React, { useState, useEffect } from "react";
import { Table, MenuItem, Order } from "../types.ts";
import { api } from "../lib/api.ts";
import { io } from "socket.io-client";
import { useTableSession } from "../context/TableSessionContext.tsx";
import OrderTracker from "./OrderTracker.tsx";
import {
  Coffee,
  ShoppingCart,
  Clock,
  Sparkles,
  Utensils,
  AlertCircle,
  Plus,
  Compass,
  Trash2,
  Minus,
  X,
  ShoppingBag,
  MessageSquare,
  Receipt,
  ClipboardList,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomerViewProps {
  tableId: number;
}

export default function CustomerView({ tableId: propTableId }: CustomerViewProps) {
  const { tableId, setTableId, setSessionToken } = useTableSession();
  const activeTableId = tableId ?? propTableId;

  const [table, setTable] = useState<Table | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; notes: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [orderPlacing, setOrderPlacing] = useState(false);
  
  // Active Tab state ("menu", "cart", "tracker")
  const [activeTab, setActiveTab] = useState<"menu" | "cart" | "tracker">("menu");

  // Live Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Food emoji animation states
  const [showFoodAnimation, setShowFoodAnimation] = useState(false);
  const [animatedEmojis, setAnimatedEmojis] = useState<{
    id: number;
    emoji: string;
    left: number;
    delay: number;
    duration: number;
    scale: number;
    rotate: number;
  }[]>([]);

  const triggerFoodAnimation = () => {
    const foodEmojis = ["🍔", "🍕", "🍜", "🍰", "🍟", "🍛", "🍩", "🍣", "🌮", "🥤", "🍗", "🥪", "🍳", "🍡", "🍦", "🥞", "🍝", "🥟", "🍧", "🍱", "🧁", "🍉"];
    const newList = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
      left: Math.random() * 90 + 5, // percentage of container width
      delay: Math.random() * 1.5,
      duration: 3 + Math.random() * 3,
      scale: 0.6 + Math.random() * 0.8,
      rotate: Math.random() * 360 - 180,
    }));
    setAnimatedEmojis(newList);
    setShowFoodAnimation(true);
    
    // Auto-dismiss after 6.5 seconds
    setTimeout(() => {
      setShowFoodAnimation(false);
    }, 6500);
  };

  const triggerFoodAnimationRef = React.useRef(triggerFoodAnimation);
  useEffect(() => {
    triggerFoodAnimationRef.current = triggerFoodAnimation;
  }, [triggerFoodAnimation]);

  // Feedback fields
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Edit order and bill request states
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [billRequestLoading, setBillRequestLoading] = useState(false);

  // Subtle live status changes toast triggering
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4500);
  };

  // Synchronize table session id with context state
  useEffect(() => {
    if (activeTableId && activeTableId !== tableId) {
      setTableId(activeTableId);
    }
  }, [activeTableId, tableId, setTableId]);

  // Load everything on initial mount & tableId changes
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if URL has scan=true
      const params = new URLSearchParams(window.location.search);
      const isScan = params.get("scan") === "true";

      // 1. Get Table Status and Active Order
      const tableData = await api.getTableStatus(activeTableId, isScan);
      setTable(tableData.table);
      setActiveOrder(tableData.activeOrder);

      // Store the sessionToken returned from the server if it exists!
      if (tableData.sessionToken) {
        setSessionToken(tableData.sessionToken);
      }

      // If we did a scan, clean up the scan query parameter so a normal page reload doesn't trigger a new session
      if (isScan) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("scan");
        window.history.replaceState({}, "", newUrl.toString());
      }

      // Auto-set tab to tracker if they have an active order on initial load
      if (tableData.activeOrder && tableData.activeOrder.status !== "completed") {
        setActiveTab("tracker");
      }

      // 2. Get Public Menu
      const menuData = await api.getPublicMenu();
      setMenu(menuData);
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize table session. Make sure table ID is valid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up Socket.io client
    const socket = io({
      transports: ["polling", "websocket"]
    });

    socket.emit("join-table", activeTableId);

    socket.on("order:updated", (order: Order) => {
      if (order.tableId === activeTableId) {
        setActiveOrder((prevOrder) => {
          // Compare previous status to trigger a beautiful toast notification
          if (prevOrder && prevOrder.status !== order.status) {
            const statusLabels: Record<string, string> = {
              pending: "Order Placed! 📝",
              preparing: "We will prepare your food 🧑‍🍳🔥",
              ready: "Your food is on the way! 🚀🛵🍔",
              completed: "Order delivered! Enjoy your meal. ❤️",
            };
            const msg = statusLabels[order.status] || `Order status updated to: ${order.status}`;
            showToast(msg);

            // Trigger animation when the food status becomes ready ("on the way")
            if (order.status === "ready") {
              triggerFoodAnimationRef.current();
            }
          }
          return order;
        });
      }
    });

    socket.on("table:status_changed", (data: { tableId: number; status: Table["status"] }) => {
      if (data.tableId === activeTableId) {
        setTable((prev) => (prev ? { ...prev, status: data.status } : null));
        if (data.status === "available") {
          setActiveOrder(null);
        }
      }
    });

    socket.on("menu:updated", () => {
      api.getPublicMenu().then(setMenu).catch(console.error);
    });

    // Poll table status every 20 seconds as a fallback
    const interval = setInterval(() => {
      api.getTableStatus(activeTableId)
        .then((res) => {
          setTable(res.table);
          setActiveOrder((prevOrder) => {
            if (prevOrder && res.activeOrder && prevOrder.status !== res.activeOrder.status) {
              const statusLabels: Record<string, string> = {
                pending: "Order Placed! 📝",
                preparing: "We will prepare your food 🧑‍🍳🔥",
                ready: "Your food is on the way! 🚀🛵🍔",
                completed: "Order delivered! Enjoy your meal. ❤️",
              };
              const msg = statusLabels[res.activeOrder.status] || `Order status updated to: ${res.activeOrder.status}`;
              showToast(msg);

              // Trigger animation when the food status becomes ready ("on the way")
              if (res.activeOrder.status === "ready") {
                triggerFoodAnimationRef.current();
              }
            }
            return res.activeOrder;
          });
        })
        .catch(console.error);
    }, 20000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [activeTableId]);

  const categories = ["All", ...Array.from(new Set(menu.map((m) => m.category)))];

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesDietary = dietaryFilter === "all" || item.dietType === dietaryFilter;
    return matchesCategory && matchesDietary;
  });

  const addToCart = (item: MenuItem) => {
    if (activeOrder?.billRequested) {
      showToast("🔒 Ordering locked. Please scan your table QR code to start a new order.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1, notes: "" }];
    });
    showToast(`Added "${item.name}" to cart! 🛍️`);
  };

  const updateCartQuantity = (itemId: number, change: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + change;
            return { ...c, quantity: newQty };
          }
          return c;
        })
        .filter((c) => c.quantity > 0)
    );
  };

  const updateCartNotes = (itemId: number, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, notes } : c))
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Place order via POST /api/orders endpoint or PATCH /api/orders/:id/items
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (activeOrder?.billRequested) {
      showToast("🔒 Ordering locked. Please scan your table QR code to start a new order.");
      return;
    }
    setOrderPlacing(true);
    setError(null);

    try {
      const orderItems = cart.map((c) => ({
        menuItemId: c.item.id,
        quantity: c.quantity,
        notes: c.notes,
      }));

      let fullOrder;
      if (editingOrderId) {
        // PATCH /api/orders/:id/items
        fullOrder = await api.patchOrderItems(editingOrderId, orderItems);
        setEditingOrderId(null);
        showToast("Order Placed! 📝");
      } else {
        // POST /api/orders
        fullOrder = await api.postOrder(activeTableId, orderItems);
        showToast("Order Placed! 📝");
      }
      
      setCart([]);
      setActiveOrder(fullOrder);
      setFeedbackSubmitted(false); // Reset feedback form
      setActiveTab("tracker"); // Navigate immediately to active order tracker
    } catch (err: any) {
      setError(err.message || "Failed to submit order");
      showToast(err.message || "Could not place/update order. Please check item availability.");
    } finally {
      setOrderPlacing(false);
    }
  };

  const handleEditOrder = () => {
    if (!activeOrder || !activeOrder.items) return;

    if (activeOrder.billRequested) {
      showToast("🔒 Ordering locked. Please scan your table QR code to start a new order.");
      return;
    }

    if (activeOrder.status === "ready" || activeOrder.status === "completed") {
      showToast("Cannot edit this order: it is already ready or completed!");
      return;
    }

    const prefilledCart = activeOrder.items.map((orderItem) => {
      const menuItem = menu.find((m) => m.id === orderItem.menuItemId) || ({
        id: orderItem.menuItemId,
        name: orderItem.name,
        price: orderItem.unitPrice,
        description: "",
        category: "",
        imageUrl: orderItem.imageUrl || null,
        isAvailable: true,
        createdAt: "",
      } as MenuItem);

      return {
        item: menuItem,
        quantity: orderItem.quantity,
        notes: orderItem.notes || "",
      };
    });

    setCart(prefilledCart);
    setEditingOrderId(activeOrder.id);
    setActiveTab("cart");
    showToast("Basket loaded with your active order. Make edits and press 'Update Table Order'!");
  };

  const handleRequestBill = async () => {
    if (!activeOrder) return;
    setBillRequestLoading(true);
    try {
      const updatedOrder = await api.requestBill(activeOrder.id);
      setActiveOrder(updatedOrder);
      showToast("Bill request sent! A host will bring your receipt shortly.");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to request bill. Please call your host.");
    } finally {
      setBillRequestLoading(false);
    }
  };

  const handleTrackerFeedbackSubmit = async (rating: number, comment: string, customerName?: string) => {
    if (!activeOrder) return;
    setFeedbackLoading(true);
    try {
      await api.submitFeedback(activeOrder.id, rating, comment, customerName);
      setFeedbackSubmitted(true);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to submit feedback. Try again later.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Determine whether to display Order Tracker or Menu Catalog
  const hasActiveOrder = activeOrder !== null && activeOrder.status !== "completed";

  if (loading && !table) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50/20 p-6">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <Coffee className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-sm font-medium text-slate-500 mt-4 animate-pulse">Setting up your table session...</p>
      </div>
    );
  }

  if (error && !table) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50/20 p-6 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Oops! Connection Error</h2>
        <p className="text-slate-500 text-sm max-w-sm mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] sm:min-h-screen bg-slate-900 flex justify-center items-center p-0 sm:p-6 font-sans text-slate-800 overflow-hidden sm:overflow-visible">
      {/* Smartphone Mockup Frame */}
      <div className="w-full max-w-md h-full sm:h-[840px] sm:max-h-[92vh] bg-slate-50 flex flex-col rounded-none sm:rounded-[40px] shadow-2xl overflow-hidden relative border border-slate-200/50 sm:border-slate-800 sm:ring-8 sm:ring-slate-950">
        
        {/* Food Delivery & Emoji Rain Animation Overlay */}
        <AnimatePresence>
          {showFoodAnimation && (
            <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none">
              {/* Overlay Backdrop to bring focus to the animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950"
              />

              {/* Falling Food Emojis */}
              {animatedEmojis.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ 
                    y: -50, 
                    x: `${item.left}%`, 
                    scale: 0, 
                    rotate: 0,
                    opacity: 0 
                  }}
                  animate={{ 
                    y: ["0%", "110%"],
                    scale: [0, item.scale, item.scale, 0],
                    rotate: [0, item.rotate],
                    opacity: [0, 1, 1, 0]
                  }}
                  transition={{ 
                    duration: item.duration, 
                    delay: item.delay,
                    ease: "linear",
                    repeat: 0
                  }}
                  className="absolute text-3xl"
                  style={{ left: 0 }} // positioning with x transform
                >
                  {item.emoji}
                </motion.div>
              ))}

              {/* Animated delivery vehicle moving across */}
              <motion.div
                initial={{ x: "-120%", y: "75%" }}
                animate={{ 
                  x: ["-20%", "120%"],
                  y: ["75%", "73%", "76%", "74%", "75%"] // slightly bumpy road feel
                }}
                transition={{ 
                  duration: 5,
                  delay: 0.5,
                  ease: "easeInOut"
                }}
                className="absolute left-0 text-5xl flex items-center gap-1"
              >
                {/* Hot Food box/trail behind scooter */}
                <span className="text-2xl animate-bounce">🍕</span>
                <span className="text-2xl animate-bounce delay-150">🍔</span>
                <span className="text-6xl filter drop-shadow-md">🛵</span>
                <span className="text-2xl">💨</span>
              </motion.div>

              {/* Delivery message banner in center */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ type: "spring", damping: 15 }}
                className="absolute top-1/4 left-6 right-6 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl text-center border border-slate-800 flex flex-col items-center gap-3.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-3xl animate-bounce shadow-lg shadow-amber-500/20">
                  🛵
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white uppercase tracking-wider">Your food is on the way!</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                    Our delivery rider is heading to your table. Get ready for some delicious bites! 😋🍔🍕
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification Container */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-4 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md text-white p-4.5 rounded-2xl shadow-xl flex items-center gap-3.5 border border-slate-800"
            >
              <div className="w-8.5 h-8.5 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-100 leading-normal">{toastMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Table Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-md shadow-amber-500/25">
              <Coffee className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                AS DEV STUDIO
              </h1>
              <p className="text-[10px] text-amber-600 font-extrabold tracking-wider mt-1.5 uppercase">
                {table?.label || `Table ${activeTableId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick link status display */}
            {hasActiveOrder ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold capitalize">
                <Clock className="w-3 h-3 animate-spin" />
                Order: {activeOrder.status}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                Guest Session
              </span>
            )}
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pb-24">
          {/* Main Container */}
          <main className="px-4 mt-6">
        {activeTab === "tracker" ? (
          /* Live Order Stepper and Item details */
          activeOrder ? (
            <OrderTracker
              order={activeOrder}
              onAddMore={() => setActiveTab("menu")}
              onEditOrder={handleEditOrder}
              onRequestBill={handleRequestBill}
              billRequestLoading={billRequestLoading}
              feedbackSubmitted={feedbackSubmitted}
              onSubmitFeedback={handleTrackerFeedbackSubmit}
              feedbackLoading={feedbackLoading}
              onTriggerAnimation={triggerFoodAnimation}
            />
          ) : (
            /* Empty Active Order Tracker State */
            <div className="bg-white rounded-3xl border border-slate-150 p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No Active Orders</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                  You do not have any active orders for this table currently. Browse our catalogue to place an order!
                </p>
              </div>
              <button
                onClick={() => setActiveTab("menu")}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          )
        ) : activeTab === "cart" ? (
          /* Dedicated Inline Cart (Basket) View */
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                Your Basket
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"} selected. Review and place your order.
              </p>
            </div>

            {activeOrder?.billRequested && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed shadow-sm">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-rose-900">Ordering Locked (Bill Requested)</p>
                  <p className="text-slate-600 mt-1">
                    Your bill has been requested. To place more orders or start a new session, please <strong>re-scan the QR code</strong> on your table.
                  </p>
                </div>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">Your basket is empty.</p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((cartItem) => (
                  <div
                    key={cartItem.item.id}
                    className="bg-white rounded-3xl p-4 border border-slate-150 space-y-3 shadow-xs"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                        <img
                          src={cartItem.item.imageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop"}
                          alt={cartItem.item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900 truncate">
                            {cartItem.item.name}
                          </h4>
                          <span className="font-mono text-sm font-bold text-slate-800 shrink-0">
                            ₹{(cartItem.item.price * cartItem.quantity).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          ₹{cartItem.item.price.toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    {/* Notes / Special Instructions */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={cartItem.notes}
                        onChange={(e) => updateCartNotes(cartItem.item.id, e.target.value)}
                        disabled={orderPlacing}
                        placeholder="Add special instructions (e.g., no sugar)..."
                        className="w-full bg-slate-50 border border-slate-150 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400/25 transition-all"
                      />
                    </div>

                    {/* Quantity adjusting actions */}
                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => updateCartQuantity(cartItem.item.id, -cartItem.quantity)}
                        disabled={orderPlacing}
                        className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer flex items-center gap-1.5 py-1.5 px-2.5 bg-red-50/50 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateCartQuantity(cartItem.item.id, -1)}
                          disabled={orderPlacing}
                          className="w-8 h-8 bg-slate-50 hover:bg-slate-100 border border-slate-150 active:scale-95 rounded-lg flex items-center justify-center text-slate-600 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-mono font-bold w-6 text-center text-slate-800">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(cartItem.item.id, 1)}
                          disabled={orderPlacing}
                          className="w-8 h-8 bg-slate-50 hover:bg-slate-100 border border-slate-150 active:scale-95 rounded-lg flex items-center justify-center text-slate-600 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Billing Price Breakdown */}
                <div className="bg-white rounded-3xl p-5 border border-slate-150 space-y-3 shadow-xs">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Billing Summary</h3>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-700">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Sales Tax (8%)</span>
                    <span className="font-mono font-bold text-slate-700">₹{(cartTotal * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total Billing Price</span>
                    <span className="font-mono text-amber-800 text-base">₹{(cartTotal * 1.08).toFixed(2)}</span>
                  </div>
                </div>

                {/* Place / Update Order Button */}
                <button
                  onClick={handleCheckout}
                  disabled={orderPlacing || !!activeOrder?.billRequested}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  {orderPlacing ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                      <span>Sending to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <Utensils className="w-4 h-4" />
                      <span>
                        {editingOrderId ? "Update Table Order" : "Place Table Order"} (₹{(cartTotal * 1.08).toFixed(2)})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Category scroller and menu item listing (activeTab === "menu") */
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Compass className="w-5 h-5 text-amber-600" />
                Browse Catalogue
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Tap on dishes to add them to your order, specify custom options, and check out instantly.
              </p>
            </div>

            {activeOrder?.billRequested && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed shadow-sm">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-rose-900">Ordering Locked (Bill Requested)</p>
                  <p className="text-slate-600 mt-1">
                    Your bill has been requested. To place a new order or start a new session, please <strong>re-scan the QR code</strong> on your table.
                  </p>
                </div>
              </div>
            )}

            {/* Categories Scroll Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4.5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0 snap-center ${
                    activeCategory === cat
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm shadow-amber-500/15"
                      : "bg-white text-slate-600 border-slate-150 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dietary Preference Filter */}
            <div className="flex bg-slate-100/75 border border-slate-200/50 p-1 rounded-2xl gap-1">
              <button
                onClick={() => setDietaryFilter("all")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dietaryFilter === "all"
                    ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-850"
                }`}
              >
                All Food ({menu.length})
              </button>
              <button
                onClick={() => setDietaryFilter("veg")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dietaryFilter === "veg"
                    ? "bg-white text-emerald-700 shadow-xs border border-emerald-200/50"
                    : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-emerald-200 inline-block shrink-0"></span>
                Veg Only ({menu.filter(m => m.dietType === "veg").length})
              </button>
              <button
                onClick={() => setDietaryFilter("non-veg")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dietaryFilter === "non-veg"
                    ? "bg-white text-rose-700 shadow-xs border border-rose-200/50"
                    : "text-slate-500 hover:text-rose-600"
                }`}
              >
                <span className="w-2.5 h-2.5 bg-rose-600 inline-block [clip-path:polygon(50%_0%,0%_100%,100%_100%)] shrink-0"></span>
                Non-Veg ({menu.filter(m => m.dietType === "non-veg").length})
              </button>
            </div>

            {/* Menu Cards */}
            <div className="space-y-3.5">
              {filteredMenu.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center text-slate-400">
                  <Utensils className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No items available currently.</p>
                </div>
              ) : (
                filteredMenu.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    id={`menu-item-${item.id}`}
                    className={`bg-white rounded-3xl p-4 border border-slate-150 shadow-xs flex gap-4 transition-all duration-200 ${
                      !item.isAvailable ? "opacity-60 saturate-50" : ""
                    }`}
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 relative border border-slate-100">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop"}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm leading-snug truncate flex items-center gap-1.5 min-w-0">
                            {/* Veg / Non-Veg Standard Dot Symbol */}
                            {item.dietType === "non-veg" ? (
                              <span className="w-3.5 h-3.5 border border-rose-500/40 bg-rose-50 flex items-center justify-center rounded shrink-0" title="Non-Vegetarian">
                                <span className="w-1.5 h-1.5 bg-rose-600 [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></span>
                              </span>
                            ) : (
                              <span className="w-3.5 h-3.5 border border-emerald-500/40 bg-emerald-50 flex items-center justify-center rounded shrink-0" title="Vegetarian">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              </span>
                            )}
                            <span className="truncate">{item.name} – ₹{item.price}</span>
                          </h4>
                          <span className="font-mono text-xs font-bold text-slate-900 shrink-0">
                            ₹{item.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] font-medium mt-1 line-clamp-2 leading-relaxed">
                          {item.description || "Freshly made on-demand with fine ingredients."}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                        {item.isAvailable ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
          </main>
        </div>

        {/* Persistent Bottom Tab Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 py-3.5 px-4 shadow-xl z-40 flex justify-around items-center rounded-t-3xl">
          {/* Tab 1: Menu */}
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === "menu" ? "text-amber-600 font-bold" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <Utensils className="w-5.5 h-5.5" />
            <span className="text-[11px] font-bold tracking-tight">Menu</span>
          </button>

          {/* Tab 2: Basket / Cart */}
          <button
            onClick={() => setActiveTab("cart")}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === "cart" ? "text-amber-600 font-bold" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5.5 h-5.5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white rounded-full text-[9px] font-black h-4.5 min-w-[18px] px-1 flex items-center justify-center border border-white animate-bounce">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold tracking-tight">
              Basket
            </span>
          </button>

          {/* Tab 3: Track & Pay */}
          <button
            onClick={() => setActiveTab("tracker")}
            className={`flex flex-col items-center gap-1 py-1 px-3.5 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === "tracker" ? "text-amber-600 font-bold" : "text-slate-400 font-medium hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <Clock className={`w-5.5 h-5.5 ${hasActiveOrder ? "text-amber-500 animate-spin" : ""}`} />
              {hasActiveOrder && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white animate-ping" />
              )}
            </div>
            <span className="text-[11px] font-bold tracking-tight">Track & Pay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
