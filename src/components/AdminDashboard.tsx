import React, { useState, useEffect, useCallback, useRef } from "react";
import { Table, MenuItem, Order, Feedback, OrderHistoryRecord, Owner } from "../types.ts";
import { api } from "../lib/api.ts";
import { io } from "socket.io-client";
import {
  Coffee,
  LayoutDashboard,
  UtensilsCrossed,
  Grid,
  ClipboardList,
  MessageSquare,
  QrCode,
  LogOut,
  Plus,
  TrendingUp,
  DollarSign,
  Users,
  Star,
  Check,
  AlertTriangle,
  Play,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  Volume2,
  Volume1,
  VolumeX,
  BellRing,
  CreditCard,
  Banknote,
  Printer,
  Receipt,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TableGrid } from "./TableGrid.tsx";
import { OrderBoard } from "./OrderBoard.tsx";
import { MenuManager } from "./MenuManager.tsx";
import { SalesReport } from "./SalesReport.tsx";
import { OrderHistoryView } from "./OrderHistoryView.tsx";

interface AdminToast {
  id: string;
  orderId: number;
  tableId: number;
  tableLabel: string;
  itemCount: number;
  type?: "order" | "bill";
  totalPrice?: number;
}

interface AdminDashboardProps {
  owner: Owner;
  onLogout: () => void;
}

export default function AdminDashboard({ owner, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "tables" | "menu" | "feedback" | "reports" | "history" | "staff" | "bills">(
    owner.role === "reception" ? "orders" : "overview"
  );
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const [isAudioSuspended, setIsAudioSuspended] = useState(false);
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [historyList, setHistoryList] = useState<OrderHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff Management State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");

  // Form states
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState<number | "">(4);
  const [showAddTableModal, setShowAddTableModal] = useState(false);

  // Menu Form
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Coffee",
    imageUrl: "",
    dietType: "veg",
    isAvailable: true,
  });
  const [editingMenuItemId, setEditingMenuItemId] = useState<number | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // QR Modal
  const [activeQrTable, setActiveQrTable] = useState<Table | null>(null);

  // Payment settlement state
  const [settleOrderId, setSettleOrderId] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);

  // Printing state for thermal receipt preview
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);



  // Public domain / QR code Base URL config
  const [publicUrl, setPublicUrl] = useState<string>(() => {
    const stored = localStorage.getItem("cafe_public_url");
    if (stored) return stored;
    const origin = window.location.origin;
    if (origin.includes("ais-dev-")) {
      return origin.replace("ais-dev-", "ais-pre-");
    }
    return origin;
  });

  const handleUpdatePublicUrl = (newUrl: string) => {
    setPublicUrl(newUrl);
    localStorage.setItem("cafe_public_url", newUrl);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tRes, mRes, oRes, fRes, hRes] = await Promise.all([
        api.getAdminTables(),
        api.getAdminMenu(),
        api.getAdminOrders(),
        api.getAdminFeedback(),
        api.getAdminHistory(),
      ]);
      setTablesList(tRes);
      setMenuList(mRes);
      setOrdersList(oRes);
      setFeedbackList(fRes);
      setHistoryList(hRes);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (owner.role !== "owner") return;
    try {
      setStaffLoading(true);
      setStaffError("");
      const list = await api.getStaffList();
      setStaffList(list);
    } catch (err: any) {
      setStaffError(err.message || "Failed to load staff list");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail || !newStaffPassword) {
      setStaffError("Please fill out all fields");
      return;
    }
    try {
      setStaffLoading(true);
      setStaffError("");
      setStaffSuccess("");
      await api.createStaffUser(newStaffEmail, newStaffPassword);
      setNewStaffEmail("");
      setNewStaffPassword("");
      setStaffSuccess("Receptionist staff added successfully!");
      fetchStaff();
    } catch (err: any) {
      setStaffError(err.message || "Failed to create staff account");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this receptionist account?")) {
      return;
    }
    try {
      setStaffLoading(true);
      setStaffError("");
      setStaffSuccess("");
      await api.deleteStaffUser(id);
      setStaffSuccess("Receptionist account deleted successfully.");
      fetchStaff();
    } catch (err: any) {
      setStaffError(err.message || "Failed to delete staff account");
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "staff" && owner.role === "owner") {
      fetchStaff();
    }
  }, [activeTab, owner.role]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      
      // Attempt to reuse global audio context from root if initialized
      if ((window as any).globalAudioContext) {
        audioCtxRef.current = (window as any).globalAudioContext;
      }
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
        (window as any).globalAudioContext = audioCtxRef.current;
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().then(() => {
            setIsAudioSuspended(false);
          }).catch(() => {});
        } else {
          setIsAudioSuspended(false);
        }
      }
      return audioCtxRef.current;
    } catch (err) {
      console.error("AudioContext initialization error:", err);
      return null;
    }
  };

  useEffect(() => {
    const checkState = () => {
      if (audioCtxRef.current) {
        setIsAudioSuspended(audioCtxRef.current.state === "suspended");
      } else {
        setIsAudioSuspended(true);
      }
    };
    const resumeAudio = () => {
      const ctx = initAudioContext();
      if (ctx) {
        ctx.resume().then(checkState).catch(checkState);
      }
    };
    window.addEventListener("click", resumeAudio);
    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    
    // Check initially and periodically
    checkState();
    const interval = setInterval(checkState, 2000);

    return () => {
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
      clearInterval(interval);
    };
  }, []);

  const [alertSoundType, setAlertSoundType] = useState<"standard" | "loud" | "muted">(() => {
    const stored = localStorage.getItem("adminAlertSoundType");
    if (stored === "standard" || stored === "loud" || stored === "muted") {
      return stored;
    }
    return "loud"; // Default to loud kitchen buzzer on customer order!
  });

  const playChime = useCallback((force = false, forceType?: "standard" | "loud") => {
    const currentType = forceType || alertSoundType;
    if (currentType === "muted" && !force) return;
    
    const resolvedType = currentType === "muted" ? "standard" : currentType;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      
      const play = () => {
        const now = ctx.currentTime;
        if (resolvedType === "loud") {
          // High-intensity, high-volume kitchen ticket buzzer / repeating siren
          // We will make 3 sharp, extremely distinct loud buzzy beeps using combined sawtooth and square waves for maximum penetrative volume
          const duration = 0.22;
          const pulses = [0.0, 0.35, 0.7]; // Three powerful pulses
          
          pulses.forEach((startTime) => {
            // Primary Oscillator (Sawtooth) for bite and high volume
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sawtooth";
            osc1.frequency.setValueAtTime(880, now + startTime); // A5
            
            gain1.gain.setValueAtTime(0, now + startTime);
            gain1.gain.linearRampToValueAtTime(0.85, now + startTime + 0.02);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
            
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            
            osc1.start(now + startTime);
            osc1.stop(now + startTime + duration + 0.05);

            // Secondary Oscillator (Square) slightly detuned for heavy acoustic vibration / buzzer effect
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "square";
            osc2.frequency.setValueAtTime(884, now + startTime); // 884 Hz
            
            gain2.gain.setValueAtTime(0, now + startTime);
            gain2.gain.linearRampToValueAtTime(0.65, now + startTime + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            
            osc2.start(now + startTime);
            osc2.stop(now + startTime + duration + 0.05);
          });
        } else {
          // Standard elegant triple-tone digital chime
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(523.25, now); // C5
          gain1.gain.setValueAtTime(0.12, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.45);
          
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.setValueAtTime(0.12, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12 + 0.45);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.12);
          osc2.stop(now + 0.12 + 0.45);

          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.type = "sine";
          osc3.frequency.setValueAtTime(1046.50, now + 0.24); // C6
          gain3.gain.setValueAtTime(0, now);
          gain3.gain.setValueAtTime(0.15, now + 0.24);
          gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.24 + 0.6);
          osc3.connect(gain3);
          gain3.connect(ctx.destination);
          osc3.start(now + 0.24);
          osc3.stop(now + 0.24 + 0.6);
        }
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(play);
      } else {
        play();
      }
    } catch (err) {
      console.error("Web Audio API chime error:", err);
    }
  }, [alertSoundType]);

  const playBillChime = useCallback((force = false, forceType?: "standard" | "loud") => {
    const currentType = forceType || alertSoundType;
    if (currentType === "muted" && !force) return;
    
    const resolvedType = currentType === "muted" ? "standard" : currentType;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      
      const play = () => {
        const now = ctx.currentTime;
        if (resolvedType === "loud") {
          // High-volume urgent alarm specifically for bill requests (F6 and A6 double pulse)
          const billBeeps = [
            { time: 0.0, freq: 1396.91 }, // F6
            { time: 0.12, freq: 1396.91 }, // F6
            { time: 0.35, freq: 1760.00 }, // A6
            { time: 0.47, freq: 1760.00 }, // A6
          ];

          billBeeps.forEach((beep) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(beep.freq, now + beep.time);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.4, now + beep.time);
            gain.gain.exponentialRampToValueAtTime(0.001, now + beep.time + 0.10);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + beep.time);
            osc.stop(now + beep.time + 0.11);
          });
        } else {
          // Standard high E6/G6 matching chime
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(1318.51, now); // E6
          gain1.gain.setValueAtTime(0.12, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.30);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1567.98, now + 0.15); // G6
          gain2.gain.setValueAtTime(0, now);
          gain2.gain.setValueAtTime(0.12, now + 0.15);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + 0.30);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.15);
          osc2.stop(now + 0.15 + 0.30);
        }
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(play);
      } else {
        play();
      }
    } catch (err) {
      console.error("Web Audio API bill chime error:", err);
    }
  }, [alertSoundType]);

  const cycleSound = () => {
    let nextType: "standard" | "loud" | "muted";
    if (alertSoundType === "muted") {
      nextType = "standard";
    } else if (alertSoundType === "standard") {
      nextType = "loud";
    } else {
      nextType = "muted";
    }
    
    setAlertSoundType(nextType);
    localStorage.setItem("adminAlertSoundType", nextType);
    localStorage.setItem("adminSoundEnabled", nextType !== "muted" ? "true" : "false");

    // Play feedback sound
    if (nextType !== "muted") {
      setTimeout(() => {
        try {
          const ctx = initAudioContext();
          if (!ctx) return;
          const play = () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = nextType === "loud" ? "triangle" : "sine";
            osc.frequency.setValueAtTime(nextType === "loud" ? 1100 : 880, ctx.currentTime);
            gain.gain.setValueAtTime(nextType === "loud" ? 0.3 : 0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          };

          if (ctx.state === "suspended") {
            ctx.resume().then(play).catch(play);
          } else {
            play();
          }
        } catch (e) {}
      }, 50);
    }
  };

  const playChimeRef = useRef(playChime);
  const playBillChimeRef = useRef(playBillChime);
  useEffect(() => {
    playChimeRef.current = playChime;
    playBillChimeRef.current = playBillChime;
  }, [playChime, playBillChime]);

  useEffect(() => {
    fetchAllData();

    // Set up Socket.io client
    const socket = io({
      transports: ["polling", "websocket"]
    });

    socket.on("order:new", (order: Order) => {
      setOrdersList((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      api.getAdminTables().then(setTablesList).catch(console.error);

      // Play audio chime via stable ref
      playChimeRef.current();

      // Aggregate count of items
      const totalUnits = order.items
        ? order.items.reduce((sum, item) => sum + item.quantity, 0)
        : 1;

      // Create new toast
      const toastId = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          orderId: order.id,
          tableId: order.tableId,
          tableLabel: order.tableLabel || `Table ${order.tableId}`,
          itemCount: totalUnits,
        },
      ]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
    });

    socket.on("order:updated", (order: Order) => {
      setOrdersList((prev) =>
        prev.map((o) => (o.id === order.id ? order : o))
      );
      if (order.status === "completed") {
        api.getAdminHistory().then(setHistoryList).catch(console.error);
        api.getAdminTables().then(setTablesList).catch(console.error);
      }
    });

    socket.on("bill:requested", (data: { orderId: number; tableId: number; tableLabel: string; totalPrice: number }) => {
      // Reload lists so the billRequest state is updated everywhere
      Promise.all([
        api.getAdminOrders(),
        api.getAdminTables(),
      ]).then(([oRes, tRes]) => {
        setOrdersList(oRes);
        setTablesList(tRes);
      }).catch(console.error);

      // Play audio chime via stable ref
      playBillChimeRef.current();

      // Create new toast for bill request
      const toastId = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          orderId: data.orderId,
          tableId: data.tableId,
          tableLabel: data.tableLabel,
          itemCount: 0,
          type: "bill",
          totalPrice: data.totalPrice,
        },
      ]);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 10000);
    });

    socket.on("table:status_changed", (data: { tableId: number; status: Table["status"] }) => {
      setTablesList((prev) =>
        prev.map((t) => (t.id === data.tableId ? { ...t, status: data.status } : t))
      );
    });

    socket.on("menu:updated", () => {
      api.getAdminMenu().then(setMenuList).catch(console.error);
    });

    // Poll active orders every 20 seconds as a fallback
    const interval = setInterval(() => {
      Promise.all([
        api.getAdminOrders(),
        api.getAdminTables(),
        api.getAdminFeedback(),
      ]).then(([oRes, tRes, fRes]) => {
        setOrdersList(oRes);
        setTablesList(tRes);
        setFeedbackList(fRes);
      }).catch(console.error);
    }, 20000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel) return;
    try {
      const capacity = typeof newTableCapacity === "number" ? newTableCapacity : 4;
      const added = await api.createTable(newTableLabel, capacity);
      setTablesList((prev) => [...prev, added]);
      setNewTableLabel("");
      setNewTableCapacity(4);
      setShowAddTableModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add table");
    }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        name: menuForm.name,
        description: menuForm.description || null,
        price: parseFloat(menuForm.price),
        category: menuForm.category,
        imageUrl: menuForm.imageUrl || null,
        dietType: menuForm.dietType,
        isAvailable: menuForm.isAvailable,
      };

      if (editingMenuItemId) {
        const updated = await api.putMenuItem(editingMenuItemId, itemData);
        setMenuList((prev) => prev.map((item) => (item.id === editingMenuItemId ? updated : item)));
      } else {
        const added = await api.addMenuItem(itemData);
        setMenuList((prev) => [...prev, added]);
      }

      setMenuForm({ name: "", description: "", price: "", category: "Coffee", imageUrl: "", dietType: "veg", isAvailable: true });
      setEditingMenuItemId(null);
      setShowMenuModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save menu item");
    }
  };

  const handleEditMenuClick = (item: MenuItem) => {
    setEditingMenuItemId(item.id);
    setMenuForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || "",
      dietType: item.dietType || "veg",
      isAvailable: item.isAvailable,
    });
    setShowMenuModal(true);
  };

  const handleUpdateOrderStatus = async (orderId: number, nextStatus: Order["status"]) => {
    if (nextStatus === "completed") {
      setSettleOrderId(orderId);
      return;
    }

    try {
      await api.updateOrderStatus(orderId, nextStatus);
      // Reload orders & tables to match state changes
      const [oRes, tRes, hRes] = await Promise.all([
        api.getAdminOrders(),
        api.getAdminTables(),
        api.getAdminHistory(),
      ]);
      setOrdersList(oRes);
      setTablesList(tRes);
      setHistoryList(hRes);
    } catch (err) {
      console.error(err);
      alert("Failed to progress order");
    }
  };

  const handleCompleteSettlement = async (orderId: number, paymentMethod: "cash" | "online") => {
    try {
      setSettling(true);
      const orderToSettle = ordersList.find(o => o.id === orderId);
      await api.updateOrderStatus(orderId, "completed", paymentMethod);
      // Reload orders & tables to match state changes
      const [oRes, tRes, hRes] = await Promise.all([
        api.getAdminOrders(),
        api.getAdminTables(),
        api.getAdminHistory(),
      ]);
      setOrdersList(oRes);
      setTablesList(tRes);
      setHistoryList(hRes);
      setSettleOrderId(null);
      if (orderToSettle) {
        setPrintingOrder({
          ...orderToSettle,
          paymentMethod,
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to settle order payment");
    } finally {
      setSettling(false);
    }
  };

  const handlePrintSlip = (order: any) => {
    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) {
      alert("Please allow popups to print physical bill slips.");
      return;
    }

    const subtotal = order.totalPrice || 0;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
    const paymentMethod = (order.paymentMethod || "Cash").toUpperCase();

    const itemsHtml = (order.items || []).map((item: any) => `
      <tr>
        <td style="padding: 4px 0; max-width: 140px; word-break: break-word;">${item.name}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; font-family: monospace;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right; font-family: monospace;">₹${(item.unitPrice * item.quantity).toFixed(2)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AS DEV STUDIO - Receipt #${order.id}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 15px;
            width: 72mm;
            box-sizing: border-box;
            background-color: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 16px;
            margin: 0 0 4px 0;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header p {
            margin: 2px 0;
            font-size: 10px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .details-table {
            width: 100%;
            font-size: 11px;
            margin-bottom: 10px;
          }
          .details-table td {
            padding: 2px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .items-table th {
            border-bottom: 1px dashed #000;
            padding: 4px 0;
            text-align: left;
            font-weight: bold;
          }
          .items-table td {
            vertical-align: top;
          }
          .totals-table {
            width: 100%;
            font-size: 11px;
            margin-top: 8px;
          }
          .totals-table td {
            padding: 2px 0;
          }
          .totals-table .bold {
            font-weight: bold;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            margin-top: 25px;
            font-size: 10px;
          }
          .footer p {
            margin: 4px 0;
          }
          .barcode {
            font-size: 9px;
            letter-spacing: 4px;
            text-align: center;
            margin: 10px 0;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 10px 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AS DEV STUDIO</h1>
          <p>College Campus, Food Court Zone</p>
          <p>Tel: +91 98765 43210</p>
          <p>GSTIN: 27AAAAA1111A1Z1</p>
        </div>

        <div class="divider"></div>

        <table class="details-table">
          <tr>
            <td><strong>TICKET ID:</strong> #${order.id}</td>
            <td style="text-align: right;"><strong>TABLE:</strong> ${order.tableLabel}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>DATE:</strong> ${formattedDate}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>SETTLEMENT:</strong> ${paymentMethod}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%;">ITEM</th>
              <th style="width: 10%; text-align: center;">QTY</th>
              <th style="width: 20%; text-align: right;">RATE</th>
              <th style="width: 20%; text-align: right;">AMT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right; font-family: monospace;">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Sales Tax (CGST 4% + SGST 4%):</td>
            <td style="text-align: right; font-family: monospace;">₹${tax.toFixed(2)}</td>
          </tr>
          <tr class="bold" style="border-top: 1px dashed #000; border-bottom: 1px dashed #000;">
            <td style="padding: 6px 0;">GRAND TOTAL:</td>
            <td style="text-align: right; font-family: monospace; padding: 6px 0;">₹${total.toFixed(2)}</td>
          </tr>
        </table>

        <div class="barcode">
          *C-C-${order.id}-${order.tableLabel.replace(/\s+/g, "")}*
        </div>

        <div class="footer">
          <p>Thank you for dining with us!</p>
          <p>AS DEV STUDIO • Fuel for Minds</p>
          <p>Share your feedback via the table QR!</p>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleTableStatusChange = (tableId: number, status: Table["status"]) => {
    setTablesList((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status } : t))
    );
  };

  const handleMenuChange = (updatedMenu: MenuItem[]) => {
    setMenuList(updatedMenu);
  };

  // ---------------------------------------------------------------------------
  // KPI CALCULATIONS
  // ---------------------------------------------------------------------------
  const totalRevenue = historyList.reduce((sum, h) => sum + h.totalCost, 0);
  const totalOrdersCount = historyList.length + ordersList.filter(o => o.status !== 'completed').length;
  const activeTablesCount = tablesList.filter((t) => t.status === "occupied").length;
  const averageRating =
    feedbackList.length > 0
      ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length
      : 5.0;

  // Category sales mapping for custom SVG pie/donut
  const categorySales: Record<string, number> = {};
  historyList.forEach((record) => {
    try {
      const items = JSON.parse(record.itemDetails);
      if (Array.isArray(items)) {
        items.forEach((item) => {
          // Find item category from menuList
          const menuItem = menuList.find((m) => m.name === item.name);
          const cat = menuItem?.category || "Other";
          categorySales[cat] = (categorySales[cat] || 0) + (item.unitPrice * item.quantity);
        });
      }
    } catch (e) {
      // JSON fail fallback
    }
  });

  const categorySalesArray = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
  const maxSalesVal = Math.max(...categorySalesArray.map((c) => c.value), 1);

  // ---------------------------------------------------------------------------
  // RENDER INTERACTIVE SECTIONS
  // ---------------------------------------------------------------------------
  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
      {/* Side Rail Panel */}
      <aside className="w-16 lg:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 transition-all duration-300">
        <div>
          <div className="p-4 lg:p-6 border-b border-slate-800 flex items-center justify-center lg:justify-start gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-bold text-white tracking-tight hidden lg:inline truncate">AS DEV STUDIO</span>
          </div>

          <nav className="p-2 lg:p-4 space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pb-2 px-2 hidden lg:block">
              {owner.role === "reception" ? "Reception Panel" : "Overview"}
            </div>
            {[
              { id: "overview", label: "Dashboard", icon: LayoutDashboard },
              { id: "reports", label: "Reports", icon: TrendingUp },
              { id: "orders", label: "Orders", icon: ClipboardList, badge: ordersList.filter(o => o.status === "pending").length },
              { id: "tables", label: "Tables", icon: Grid },
              { id: "bills", label: "Bill Requests", icon: CreditCard, badge: ordersList.filter(o => o.billRequested && o.status !== "completed").length },
              { id: "menu", label: "Menu", icon: UtensilsCrossed },
              { id: "history", label: "Order History", icon: Receipt },
              { id: "feedback", label: "Feedback", icon: MessageSquare },
              { id: "staff", label: "Staff Accounts", icon: Users },
            ].filter((tab) => {
              if (owner.role === "reception") {
                return ["orders", "tables", "bills", "menu", "history"].includes(tab.id);
              }
              return true;
            }).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white border-l-2 border-amber-500 rounded-l-none"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
                  title={tab.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-500" : "text-slate-400"}`} />
                  <span className="hidden lg:inline truncate">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-auto hidden lg:inline-block text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
 
        {/* User Logged Info */}
        <div className="p-2 lg:p-4 border-t border-slate-800 space-y-3 bg-slate-950/25">
          <div className="flex items-center justify-center lg:justify-start gap-3 p-2 bg-slate-800/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center uppercase text-xs shrink-0">
              {owner.email.slice(0, 2)}
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {owner.role === "reception" ? "Receptionist" : "Owner Admin"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{owner.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 rounded-lg text-xs font-semibold text-slate-400 cursor-pointer transition-all border border-slate-700"
            title="Logout Session"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
            {activeTab === "overview" && "AS DEV STUDIO"}
            {activeTab === "reports" && "Sales Reports"}
            {activeTab === "orders" && "Live Kitchen Queue"}
            {activeTab === "tables" && "Seating & QR Monitor"}
            {activeTab === "menu" && "Menu Catalog Console"}
            {activeTab === "history" && "Completed Order Archive"}
            {activeTab === "feedback" && "Customer Guest Reviews"}
            {activeTab === "staff" && "Receptionist Accounts"}
            {activeTab === "bills" && "Active Seating Bill Requests"}
          </h2>
          <div className="flex items-center gap-3">
            {/* Live Order Sound Widget */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <button
                onClick={cycleSound}
                className="flex items-center gap-1.5 px-1.5 py-1 hover:bg-slate-200/50 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer"
                title="Cycle sound alert style or mute"
              >
                {alertSoundType === "muted" && <VolumeX className="w-4 h-4 text-rose-500" />}
                {alertSoundType === "standard" && <Volume1 className="w-4 h-4 text-amber-500 animate-pulse" />}
                {alertSoundType === "loud" && <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" />}
                <span className="hidden md:inline uppercase text-[10px] tracking-wider text-slate-600">
                  Alert: {alertSoundType}
                </span>
              </button>
              <span className="w-[1px] h-3.5 bg-slate-200"></span>
              {isAudioSuspended && alertSoundType !== "muted" ? (
                <button
                  onClick={() => {
                    const ctx = initAudioContext();
                    if (ctx) {
                      ctx.resume().then(() => {
                        setIsAudioSuspended(false);
                        playChime(true);
                      });
                    }
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse transition-all cursor-pointer flex items-center gap-1"
                  title="Your browser blocked autoplay audio. Click here to authorize notification sounds."
                >
                  ⚠️ Unmute
                </button>
              ) : (
                <button
                  onClick={() => playChime(true)}
                  className="px-2 py-1 hover:bg-slate-200/50 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 transition-all cursor-pointer"
                  title="Play a test kitchen alert sound"
                >
                  Test Sound
                </button>
              )}
            </div>

            <div className="hidden">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Node.js API Online
            </div>
            <div className="hidden">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              PostgreSQL Connected
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-xs font-medium text-slate-400">Loading console data...</p>
            </div>
          ) : (
            <>
              {/* REAL-TIME PENDING BILL REQUEST ALERTS */}
              {(() => {
                const pendingBillOrders = ordersList.filter((o) => o.billRequested && o.status !== "completed");
                if (pendingBillOrders.length === 0) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm ring-4 ring-rose-500/5"
                  >
                    <div className="flex items-center gap-2 mb-3 text-rose-800">
                      <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </div>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-extrabold text-xs uppercase tracking-wider">
                        Immediate Attention Required: Bill Requested ({pendingBillOrders.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingBillOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border border-rose-150 rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-rose-300 transition-colors"
                        >
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Ticket #{order.id}
                              </span>
                              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-mono uppercase tracking-tight animate-pulse shrink-0">
                                🧾 Bill Req
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 mt-2 text-sm">
                              {order.tableLabel || `Seating Table ${order.tableId}`}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              Estimated Bill:{" "}
                              <span className="font-bold text-slate-950 text-xs">
                                ₹{(order.totalPrice * 1.08).toFixed(0)}
                              </span>{" "}
                              <span className="text-[10px] text-slate-400 font-normal">
                                (with 8% GST/Service)
                              </span>
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                            <button
                              id={`btn-bill-alert-print-${order.id}`}
                              onClick={() => setPrintingOrder(order)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all border border-slate-200"
                              title="Print customer invoice bill slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Bill</span>
                            </button>
                            <button
                              id={`btn-bill-alert-settle-${order.id}`}
                              onClick={() => setSettleOrderId(order.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-sm shadow-rose-600/10 border border-rose-700"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Settle & Pay</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              <AnimatePresence mode="wait">
              {/* 1. OVERVIEW / DASHBOARD TAB */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Console Dashboard</h1>
                      <p className="text-slate-500 text-xs mt-1">Real-time performance stats and customer sales insights</p>
                    </div>
                    <button
                      onClick={fetchAllData}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
                    >
                      Refresh Stats
                    </button>
                  </div>

                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Total Gross Revenue</div>
                        <div className="text-3xl font-bold text-slate-900">₹{totalRevenue.toFixed(2)}</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Archived sales total</div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Total Transactions</div>
                        <div className="text-3xl font-bold text-slate-900">{totalOrdersCount}</div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600 font-medium">Active & completed orders</div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Active Dining Tables</div>
                        <div className="text-3xl font-bold text-slate-900">{activeTablesCount} / {tablesList.length}</div>
                      </div>
                      <div className="mt-2 text-xs text-purple-600 font-medium font-semibold">Currently occupied status</div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Average Guest Rating</div>
                        <div className="text-3xl font-bold text-slate-900">{averageRating.toFixed(1)} ★</div>
                      </div>
                      <div className="mt-2 text-xs text-emerald-600 font-medium font-semibold">{feedbackList.length} reviews collected</div>
                    </div>
                  </div>

                {/* Custom Charts & Logs Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Chart: Category Sales Distribution (Custom Hand-Crafted SVGs) */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Revenue by Category</h3>
                      <p className="text-[10px] text-slate-400 mt-1">Aggregated sales breakdown from archived order details</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      {categorySalesArray.length === 0 ? (
                        <div className="text-center text-slate-400 py-12 text-xs font-medium">
                          No category transaction data available yet.
                        </div>
                      ) : (
                        categorySalesArray.map((cat, idx) => {
                          const pct = (cat.value / totalRevenue) * 100;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">{cat.name}</span>
                                <span className="font-mono text-slate-500">₹{cat.value.toFixed(2)} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(cat.value / maxSalesVal) * 100}%`,
                                    backgroundColor: idx === 0 ? "#F59E0B" : idx === 1 ? "#10B981" : idx === 2 ? "#3B82F6" : "#8B5CF6",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Recent Transactions Snapshot Log */}
                  <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Transactions</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Live record of closed table tickets</p>
                      </div>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">{historyList.length} Total</span>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                      {historyList.length === 0 ? (
                        <div className="text-center text-slate-400 py-12 text-xs font-medium">
                          No completed transactions yet. Completed orders will appear here.
                        </div>
                      ) : (
                        historyList.map((rec) => {
                          let items: any[] = [];
                          try {
                            items = JSON.parse(rec.itemDetails);
                          } catch (e) {}

                          return (
                            <div key={rec.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">{rec.tableLabel}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">Order #{rec.orderId}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate max-w-xs">
                                  {items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                                </p>
                                <span className="text-[9px] font-mono text-slate-400 block">
                                  {new Date(rec.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                  ₹{rec.totalCost.toFixed(2)}
                                </span>
                                <button
                                  onClick={() => setPrintingOrder({
                                    id: rec.orderId,
                                    tableLabel: rec.tableLabel,
                                    items: items,
                                    totalPrice: rec.totalCost,
                                    paymentMethod: rec.paymentMethod,
                                    createdAt: rec.createdAt
                                  })}
                                  title="Reprint Bill Slip"
                                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SALES REPORTS TAB */}
            {activeTab === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <SalesReport />
              </motion.div>
            )}

            {/* 2. ORDERS PIPELINE QUEUE TAB */}
            {activeTab === "orders" && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <OrderBoard
                  orders={ordersList}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  alertSoundType={alertSoundType}
                  onCycleSound={cycleSound}
                  onPlayTestSound={() => playChime(true)}
                />
              </motion.div>
            )}

            {/* 3. MANAGE TABLES TAB */}
            {activeTab === "tables" && (
              <motion.div
                key="tables"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Tables</h1>
                    <p className="text-slate-500 text-xs mt-1">Configure physical seating layout, inspect statuses, and print QR Codes</p>
                  </div>
                  {owner.role !== "reception" && (
                    <button
                      onClick={() => setShowAddTableModal(true)}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-white rounded-xl cursor-pointer shadow-md shadow-slate-950/10 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Seating Table
                    </button>
                  )}
                </div>

                {/* Guest Ordering URL Settings Config Card */}
                {owner.role !== "reception" && (
                  <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
                    <div className="space-y-1 max-w-lg">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        Guest Ordering URL (QR Base)
                      </h3>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        If guests scan QR codes with their own mobiles, the link must point to a public domain. 
                        {window.location.origin.includes("-dev-") && (
                          <span className="font-bold text-amber-700 block mt-1.5">
                            ⚠️ You are currently on a restricted dev URL. We have auto-routed your QR codes to the public preview domain.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                      <input
                        type="url"
                        value={publicUrl}
                        onChange={(e) => handleUpdatePublicUrl(e.target.value)}
                        placeholder="e.g., https://your-cafe-url.run.app"
                        className="flex-1 md:w-80 px-3 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdatePublicUrl(window.location.origin.includes("-dev-") ? window.location.origin.replace("-dev-", "-pre-") : window.location.origin);
                        }}
                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-all active:scale-95 cursor-pointer select-none"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                <TableGrid
                  tables={tablesList}
                  orders={ordersList}
                  onTableStatusChange={handleTableStatusChange}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onShowQrCode={setActiveQrTable}
                  onPrintOrderBill={setPrintingOrder}
                  publicUrl={publicUrl}
                />

                {/* Old Seating Grid hidden to preserve formatting safely */}
                <div className="hidden">
                  {/* Seating Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tablesList.map((table) => {
                    const qrLink = `${publicUrl}?table=${table.id}${table.token ? `&token=${table.token}` : ""}&scan=true`;
                    return (
                      <div key={table.id} className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between space-y-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">ID: {table.id}</span>
                            <h4 className="font-bold text-slate-950 text-sm mt-0.5">{table.label}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-1">Capacity: {table.capacity} guests</p>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              table.status === "available"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : table.status === "occupied"
                                ? "bg-red-50 text-red-700 border border-red-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}
                          >
                            {table.status}
                          </span>
                        </div>

                        {/* Interactive operations */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => setActiveQrTable(table)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 rounded-xl cursor-pointer transition-all"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            QR Code Terminal
                          </button>

                          <button
                            onClick={async () => {
                              const nextStatus = table.status === "available" ? "occupied" : "available";
                              await api.updateTable(table.id, { status: nextStatus });
                              setTablesList((prev) =>
                                prev.map((t) => (t.id === table.id ? { ...t, status: nextStatus } : t))
                              );
                            }}
                            className="px-3.5 py-2 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer border border-slate-200 text-[11px] font-semibold"
                          >
                            Toggle Status
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              </motion.div>
            )}

            {/* 4. MENU CATALOGUE MANAGER TAB */}
            {activeTab === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <MenuManager
                  menu={menuList}
                  onMenuChange={handleMenuChange}
                  isReadOnly={owner.role === "reception"}
                />

                {/* Old Catalog list hidden to preserve safely */}
                <div className="hidden">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Menu Catalogue Manager</h1>
                      <p className="text-slate-500 text-xs mt-1">Design available dishes, configure prices, and toggle kitchen availability</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMenuItemId(null);
                        setMenuForm({ name: "", description: "", price: "", category: "Coffee", imageUrl: "", dietType: "veg", isAvailable: true });
                        setShowMenuModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-white rounded-xl cursor-pointer shadow-md shadow-slate-950/10 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Create Menu Item
                    </button>
                  </div>

                  {/* Catalog Table list */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="p-4">Item Details</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Price</th>
                        <th className="p-4">Availability</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menuList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <img
                              src={item.imageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop"}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-cover rounded-lg shrink-0 bg-slate-100 border border-slate-100"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 max-w-sm truncate">{item.description || "No description provided."}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-600">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={async () => {
                                const updated = await api.putMenuItem(item.id, { isAvailable: !item.isAvailable });
                                setMenuList((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer border ${
                                item.isAvailable
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50"
                                  : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100/50"
                              }`}
                            >
                              {item.isAvailable ? "In Stock" : "Sold Out"}
                            </button>
                          </td>
                          <td className="p-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditMenuClick(item)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors"
                            >
                              Edit details
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to soft-delete "${item.name}"?`)) {
                                  try {
                                    await api.deleteMenuItem(item.id);
                                    setMenuList((prev) => prev.map((m) => m.id === item.id ? { ...m, isAvailable: false } : m));
                                  } catch (err) {
                                    console.error(err);
                                    alert("Failed to soft-delete menu item");
                                  }
                                }
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                              title="Soft delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </motion.div>
            )}

            {/* 5. GUEST FEEDBACK LOG TAB */}
            {activeTab === "feedback" && (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Guest Feedback Log</h1>
                  <p className="text-slate-500 text-xs mt-1">Review customer ratings and text comments left by table sessions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbackList.length === 0 ? (
                    <div className="col-span-full bg-white border border-slate-150 p-12 text-center text-slate-400 rounded-2xl">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold">No customer reviews submitted yet.</p>
                    </div>
                  ) : (
                    feedbackList.map((review) => (
                      <div key={review.id} className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{review.tableLabel || "Dining Table"}</span>
                            {review.customerName && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 ml-1.5 px-2 py-0.5 rounded font-bold">
                                👤 {review.customerName}
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono mt-1">Ticket #{review.orderId}</p>
                          </div>
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4.5 h-4.5 ${
                                  review.rating >= i + 1 ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          “{review.comment || "Left star rating only."}”
                        </p>

                        <span className="text-[9px] font-mono text-slate-400 block pt-1 border-t border-slate-50">
                          Reviewed on {new Date(review.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 6. COMPLETED ORDER ARCHIVE HISTORY TAB */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <OrderHistoryView
                  historyList={historyList}
                  onReprintBill={setPrintingOrder}
                />
              </motion.div>
            )}

            {/* 7. STAFF ACCOUNTS / RECEPTION PANEL (Owner only) */}
            {activeTab === "staff" && owner.role === "owner" && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receptionist Accounts</h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage accounts for the reception counter. Staff logged into these accounts can only access Orders, Tables, Menu, and Order History.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column: Register Form */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Add Reception User</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Register a new receptionist with limited permissions</p>
                    </div>

                    <form onSubmit={handleCreateStaff} className="space-y-4">
                      {staffError && (
                        <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-600 text-xs font-medium">
                          {staffError}
                        </div>
                      )}
                      {staffSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-700 text-xs font-medium">
                          {staffSuccess}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Email Address
                        </label>
                        <input
                          id="reception-email-input"
                          type="email"
                          required
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                          placeholder="e.g. reception@cafe.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Password
                        </label>
                        <input
                          id="reception-password-input"
                          type="password"
                          required
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <button
                        id="btn-register-receptionist"
                        type="submit"
                        disabled={staffLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {staffLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add Reception User</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Active Staff Accounts List */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Active Reception Users</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Listed below are active restricted staff accounts</p>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        {staffList.length} Active
                      </span>
                    </div>

                    {staffLoading && staffList.length === 0 ? (
                      <div className="p-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs">Loading staff list...</span>
                      </div>
                    ) : staffList.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-semibold text-slate-500">No receptionist staff accounts created yet.</p>
                        <p className="text-[11px] text-slate-400">Use the form on the left to add your first reception desk user.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {staffList.map((user) => (
                          <div key={user.id} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center uppercase text-xs">
                                {user.email.slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-900">{user.email}</p>
                                <p className="text-[10px] text-slate-400">
                                  Role: <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[9px] capitalize">{user.role}</span> • Created {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              id={`btn-delete-staff-${user.id}`}
                              onClick={() => handleDeleteStaff(user.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title="Delete staff account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8. ACTIVE BILL REQUESTS TAB */}
            {activeTab === "bills" && (
              <motion.div
                key="bills"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seating Bill Requests</h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage active guest tables waiting for their receipts, print physical invoices, and record payments.
                  </p>
                </div>

                {(() => {
                  const billingOrders = ordersList.filter((o) => o.billRequested && o.status !== "completed");
                  const totalPendingAmount = billingOrders.reduce((sum, o) => sum + (o.totalPrice * 1.08), 0);

                  return (
                    <>
                      {/* Metric Widgets */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                            <Receipt className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requests</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{billingOrders.length} Tables</h3>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <DollarSign className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Billing Collection</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-0.5">₹{totalPendingAmount.toFixed(0)}</h3>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Occupied Tables</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                              {tablesList.filter((t) => t.status === "occupied").length} / {tablesList.length}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Bill Requests Table / Cards */}
                      {billingOrders.length === 0 ? (
                        <div className="bg-white border border-slate-150 rounded-2xl p-16 text-center max-w-xl mx-auto space-y-4 shadow-sm mt-4">
                          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-slate-900 text-sm">All Clear! No Pending Bill Requests</h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                              No diners have requested their checks at this time. All active tables are currently being served or are dining happily.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                          {billingOrders.map((order) => {
                            const minutesElapsed = Math.max(
                              0,
                              Math.floor((new Date().getTime() - new Date(order.updatedAt).getTime()) / 60000)
                            );
                            const finalPrice = order.totalPrice * 1.08;

                            return (
                              <div
                                key={order.id}
                                className="bg-white border border-slate-200 hover:border-amber-200 rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between"
                              >
                                <div>
                                  {/* Header info */}
                                  <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                                    <div>
                                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 border border-slate-150 rounded-md px-1.5 py-0.5">
                                        Ticket ID: #{order.id}
                                      </span>
                                      <h3 className="text-base font-black text-slate-900 mt-1.5">
                                        {order.tableLabel || `Table ${order.tableId}`}
                                      </h3>
                                    </div>
                                    <div className="text-right space-y-1">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-tight font-mono animate-pulse">
                                        <span className="w-1 h-1 rounded-full bg-rose-600 animate-ping shrink-0" />
                                        Check Requested
                                      </span>
                                      <p className="text-[10px] text-slate-400 font-medium">
                                        Requested {minutesElapsed === 0 ? "just now" : `${minutesElapsed}m ago`}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Order Items List */}
                                  <div className="py-4 space-y-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diner Consumption Summary</p>
                                    <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto pr-1">
                                      {order.items?.map((item) => (
                                        <div key={item.id} className="flex justify-between py-2 text-xs">
                                          <div className="flex items-start gap-1.5 min-w-0">
                                            <span className="font-extrabold text-slate-400 min-w-[18px]">
                                              {item.quantity}x
                                            </span>
                                            <div className="truncate">
                                              <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                                              {item.notes && (
                                                <p className="text-[10px] text-slate-400 italic mt-0.5">"{item.notes}"</p>
                                              )}
                                            </div>
                                          </div>
                                          <span className="font-medium text-slate-600 font-mono">
                                            ₹{(item.unitPrice * item.quantity).toFixed(0)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Total breakdown */}
                                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                      <span>Items Subtotal</span>
                                      <span className="font-mono">₹{order.totalPrice.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
                                      <span>GST + Service Charge (8%)</span>
                                      <span className="font-mono">₹{(order.totalPrice * 0.08).toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                                      <span className="uppercase tracking-tight">Net Bill Amount</span>
                                      <span className="font-mono text-rose-600">₹{finalPrice.toFixed(0)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions footer */}
                                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                                  <button
                                    id={`btn-bills-print-${order.id}`}
                                    onClick={() => setPrintingOrder(order)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs cursor-pointer transition-all active:scale-[0.98]"
                                  >
                                    <Printer className="w-4 h-4" />
                                    <span>Print Bill Slip</span>
                                  </button>
                                  <button
                                    id={`btn-bills-settle-${order.id}`}
                                    onClick={() => setSettleOrderId(order.id)}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold border border-rose-700 rounded-xl text-xs cursor-pointer shadow-md shadow-rose-600/10 transition-all active:scale-[0.98]"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Settle & Pay</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </motion.div>
            )}


          </AnimatePresence>
        </>
      )}
    </main>
    </div>

      {/* MODAL 1: ADD TABLE MODAL */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Add Dining Seating</h3>
              <button onClick={() => setShowAddTableModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Table Name / Label</label>
                <input
                  type="text"
                  required
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  placeholder="e.g. Table 7, Cozy Corner"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Guest Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={newTableCapacity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTableCapacity(val === "" ? "" : parseInt(val));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg transition-all"
              >
                Register Seating
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT MENU ITEM MODAL */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">{editingMenuItemId ? "Edit Menu Catalog" : "Create Menu Offering"}</h3>
              <button onClick={() => setShowMenuModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMenuSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Offering Name</label>
                <input
                  type="text"
                  required
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  placeholder="e.g. Classic Capuccino"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Price (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    placeholder="150"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {["Coffee", "Tea", "Pastries", "Snacks", "Breakfast", "Appetizer", "Burgers", "Pasta", "Pizza", "Rice Meals", "Wraps", "Desserts", "Shakes", "Mocktails", "Winter Special"].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  placeholder="e.g. Medium roast espresso blend with warm, chocolatey highlights..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Photo URL Accent</label>
                <input
                  type="url"
                  value={menuForm.imageUrl}
                  onChange={(e) => setMenuForm({ ...menuForm, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dietary Preference</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, dietType: "veg" })}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      menuForm.dietType === "veg"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    Vegetarian (Veg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, dietType: "non-veg" })}
                    className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      menuForm.dietType === "non-veg"
                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 bg-rose-600 inline-block [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></span>
                    Non-Vegetarian
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modalIsAvailable"
                  checked={menuForm.isAvailable}
                  onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="modalIsAvailable" className="text-xs font-semibold text-slate-600">Active Stock is Available</label>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-lg transition-all"
              >
                Save Catalogue Listing
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: QR CODE GENERATOR & VIEWER */}
      {activeQrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm tracking-tight">{activeQrTable.label} QR Code</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Seat guests directly by scanning</p>
              </div>
              <button onClick={() => setActiveQrTable(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
              {/* Construction of QR Code link */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                    `${publicUrl}?table=${activeQrTable.id}${activeQrTable.token ? `&token=${activeQrTable.token}` : ""}&scan=true`
                  )}`}
                  alt={`${activeQrTable.label} QR Code`}
                  referrerPolicy="no-referrer"
                  className="w-48 h-48 block"
                />
              </div>

              <div className="space-y-2 w-full">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Guests can scan this QR code using any smartphone camera to open the menu and order instantly.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 select-all text-[10px] font-mono break-all text-slate-600">
                  {`${publicUrl}?table=${activeQrTable.id}${activeQrTable.token ? `&token=${activeQrTable.token}` : ""}&scan=true`}
                </div>
              </div>

              {activeQrTable.label.toLowerCase().includes("parcel") && (() => {
                const activeOrdersForQrTable = ordersList.filter(o => o.tableId === activeQrTable.id && o.status !== "completed");
                return (
                  <div className="w-full border-t border-slate-100 pt-5 mt-2 space-y-3 text-left">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Active Calling Tokens:
                    </div>
                    {activeOrdersForQrTable.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No active parcel/takeaway orders currently.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeOrdersForQrTable.map((order) => {
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
                            <div key={order.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  #{order.tokenNumber || order.id}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
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
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                                </svg>
                                Call Customer
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2 w-full pt-2">
                <button
                  onClick={() => {
                    const printWin = window.open("", "_blank");
                    if (printWin) {
                      printWin.document.write(`
                        <html>
                          <head>
                            <title>Print QR Code - ${activeQrTable.label}</title>
                            <style>
                              body { font-family: system-ui; text-align: center; padding: 2rem; color: #0f172a; }
                              .card { border: 2px solid #e2e8f0; border-radius: 1.5rem; padding: 3rem; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                              .qr { width: 240px; height: 240px; margin-bottom: 2rem; }
                              h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; }
                              p { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <h1>${activeQrTable.label}</h1>
                              <p>Scan to Browse Menu & Order</p>
                              <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                                `${publicUrl}?table=${activeQrTable.id}${activeQrTable.token ? `&token=${activeQrTable.token}` : ""}&scan=true`
                              )}" />
                              <div style="font-size: 10px; font-family: monospace; color: #94a3b8;">Powered by AS DEV STUDIO</div>
                            </div>
                            <script>
                              window.onload = function() { window.print(); }
                            </script>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    }
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-950/10"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Print QR Signboard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: PAYMENT SETTLEMENT MODAL */}
      {settleOrderId !== null && (() => {
        const orderToSettle = ordersList.find(o => o.id === settleOrderId);
        if (!orderToSettle) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
            >
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Settle Order Payment</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ticket #{orderToSettle.id} • {orderToSettle.tableLabel}</p>
                </div>
                <button 
                  onClick={() => setSettleOrderId(null)} 
                  disabled={settling}
                  className="text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Order Summary Billing details */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Order Items</span>
                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1 text-xs">
                    {orderToSettle.items?.map((item) => (
                      <div key={item.id} className="py-2 flex justify-between text-slate-700">
                        <span className="truncate pr-2">{item.name} <span className="text-slate-400 font-semibold">x{item.quantity}</span></span>
                        <span className="font-mono text-slate-500 shrink-0">₹{(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900">Total Settlement Amount</span>
                    <span className="font-mono text-base font-black text-amber-800 font-bold">₹{orderToSettle.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Select Payment Method</p>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Cash button */}
                    <button
                      disabled={settling}
                      onClick={() => handleCompleteSettlement(orderToSettle.id, "cash")}
                      className="group p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60"
                    >
                      <div className="w-10 h-10 bg-emerald-500 group-hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md transition-colors">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold tracking-tight">Settle with Cash</span>
                    </button>

                    {/* Online payment button */}
                    <button
                      disabled={settling}
                      onClick={() => handleCompleteSettlement(orderToSettle.id, "online")}
                      className="group p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60"
                    >
                      <div className="w-10 h-10 bg-blue-500 group-hover:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md transition-colors">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold tracking-tight">Settle Online</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={settling}
                  onClick={() => setSettleOrderId(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  Cancel & Hold Ticket
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* MODAL 5: THERMAL RECEIPT SLIP PREVIEW MODAL */}
      {printingOrder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-150 my-8"
          >
            {/* Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="font-bold text-xs tracking-tight">Customer Bill Slip Preview</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5">Physical Print Preview</p>
                </div>
              </div>
              <button 
                onClick={() => setPrintingOrder(null)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal Slip Container */}
            <div className="p-5 bg-slate-100 flex justify-center">
              {/* Skeuomorphic Paper slip */}
              <div className="w-full max-w-[280px] bg-white p-5 border border-slate-200 shadow-md relative rounded-md font-mono text-[10px] text-slate-800 leading-relaxed">
                {/* Sawtooth edge visualization (stylized header line) */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%)] bg-[size:6px_6px] bg-repeat-x rotate-180"></div>
                
                {/* Branding */}
                <div className="text-center pt-2 pb-3 space-y-0.5">
                  <h4 className="font-black text-xs tracking-widest text-slate-900 uppercase">AS DEV STUDIO</h4>
                  <p className="text-[8px] text-slate-500">College Campus, Food Court Zone</p>
                  <p className="text-[8px] text-slate-500">Tel: +91 98765 43210</p>
                  <p className="text-[8px] text-slate-500">GSTIN: 27AAAAA1111A1Z1</p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Slip Metadata */}
                <div className="space-y-0.5 text-[9px]">
                  <div className="flex justify-between">
                    <span>TICKET ID: <strong className="text-slate-900">#{printingOrder.id}</strong></span>
                    <span>TABLE: <strong className="text-slate-900">{printingOrder.tableLabel}</strong></span>
                  </div>
                  <div>DATE: {printingOrder.createdAt ? new Date(printingOrder.createdAt).toLocaleString() : new Date().toLocaleString()}</div>
                  <div className="uppercase">SETTLEMENT: <strong className="text-slate-900">{printingOrder.paymentMethod || "CASH"}</strong></div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Items list */}
                <div className="space-y-0.5 text-[9px]">
                  <div className="grid grid-cols-12 font-bold text-slate-900 pb-1 border-b border-dashed border-slate-200">
                    <span className="col-span-6">ITEM</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-2 text-right font-normal">RATE</span>
                    <span className="col-span-2 text-right">AMT</span>
                  </div>
                  {printingOrder.items?.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-12 py-0.5 text-slate-700">
                      <span className="col-span-6 truncate pr-1">{item.name}</span>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-2 text-right">₹{item.unitPrice.toFixed(0)}</span>
                      <span className="col-span-2 text-right font-bold text-slate-900">₹{(item.unitPrice * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Totals */}
                <div className="space-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(printingOrder.totalPrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sales Tax (CGST 4% + SGST 4%):</span>
                    <span>₹{((printingOrder.totalPrice || 0) * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-slate-950 pt-2 border-t border-dashed border-slate-300">
                    <span>GRAND TOTAL:</span>
                    <span>₹{((printingOrder.totalPrice || 0) * 1.08).toFixed(2)}</span>
                  </div>
                </div>

                {/* Mock Barcode */}
                <div className="text-center mt-5 pt-1 select-none">
                  <div className="text-[20px] font-serif leading-none tracking-widest text-slate-700 select-none">||| | ||||| | |||</div>
                  <p className="text-[7px] text-slate-400 mt-1 uppercase">*C-C-{printingOrder.id}-{printingOrder.tableLabel?.replace(/\s+/g, "")}*</p>
                </div>

                <div className="text-center text-[8px] text-slate-500 mt-4 leading-normal space-y-0.5">
                  <p className="font-bold">Thank you for dining with us!</p>
                  <p>AS DEV STUDIO • Fuel for Minds</p>
                  <p>Share your feedback via the table QR!</p>
                </div>

                {/* Bottom sawtooth edge */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%)] bg-[size:6px_6px] bg-repeat-x"></div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3.5 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setPrintingOrder(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handlePrintSlip(printingOrder)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                Print Physical Slip
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Real-time Order Toasts Notification Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-80 max-w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isBill = toast.type === "bill";
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 15, stiffness: 180 }}
                onClick={() => {
                  setActiveTab(isBill ? "tables" : "orders");
                  // Remove this toast upon clicking
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className={`border rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 cursor-pointer active:scale-98 transition-all pointer-events-auto select-none ${
                  isBill
                    ? "bg-rose-950 border-rose-850 hover:bg-rose-900 text-white"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-850 text-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-extrabold shadow-md ${
                  isBill 
                    ? "bg-rose-500 text-white shadow-rose-500/20" 
                    : "bg-amber-500 text-slate-950 shadow-amber-500/10"
                }`}>
                  {isBill ? "🧾" : "🛎️"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">
                    {isBill ? "Bill Requested! 🧾" : `New Order #${toast.orderId}! 🛎️`}
                  </h4>
                  <p className="text-[10px] text-slate-300 font-medium mt-0.5 truncate">
                    {isBill 
                      ? `${toast.tableLabel} • Order #${toast.orderId} • Est. ₹${((toast.totalPrice || 0) * 1.08).toFixed(0)}`
                      : `${toast.tableLabel} • ${toast.itemCount} ${toast.itemCount === 1 ? "item" : "items"}`
                    }
                  </p>
                  <p className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${
                    isBill ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {isBill ? "Tap to view seating grid" : "Tap to view queue"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
