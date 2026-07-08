import { useState, useEffect } from "react";
import { api, setAuthToken } from "./lib/api.ts";
import { Owner } from "./types.ts";
import AdminLogin from "./components/AdminLogin.tsx";
import AdminDashboard from "./components/AdminDashboard.tsx";
import CustomerView from "./components/CustomerView.tsx";
import { useTableSession } from "./context/TableSessionContext.tsx";
import { Coffee, Shield, ArrowRight, TableProperties, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const { tableId, setTableId } = useTableSession();
  const [adminUser, setAdminUser] = useState<Owner | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if we are explicitly on the admin path to bypass table session/guest view
  const isAdminPath = window.location.pathname === "/admin" || new URLSearchParams(window.location.search).has("admin");

  const [view, setView] = useState<"guest" | "admin">(
    (tableId !== null && !isAdminPath) ? "guest" : "admin"
  );

  useEffect(() => {
    if (tableId !== null && !isAdminPath) {
      setView("guest");
    } else {
      setView("admin");
    }
  }, [tableId, isAdminPath]);

  useEffect(() => {
    // Check for active owner JWT session
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("cafe_admin_token");
        if (storedToken) {
          setAuthToken(storedToken);
          const me = await api.checkMe();
          setAdminUser(me.user);
        }
      } catch (err) {
        console.warn("Session auto-login failed. Resetting token.", err);
        setAuthToken(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    initAuth();
  }, []);

  const handleLoginSuccess = (user: Owner) => {
    setAdminUser(user);
    setView("admin");
  };

  const handleLogout = async () => {
    await api.logout();
    setAdminUser(null);
  };

  const handleClearTableSession = () => {
    localStorage.removeItem("cafe_table_id");
    setTableId(null);
    setView("admin");
  };

  useEffect(() => {
    const resumeAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!(window as any).globalAudioContext) {
            (window as any).globalAudioContext = new AudioContextClass();
          }
          const ctx = (window as any).globalAudioContext;
          if (ctx && ctx.state === "suspended") {
            ctx.resume();
          }
        }
      } catch (err) {
        console.error("Global audio resume error:", err);
      }
    };

    window.addEventListener("click", resumeAudio);
    window.addEventListener("pointerdown", resumeAudio);
    window.addEventListener("keydown", resumeAudio);
    return () => {
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-slate-750 border-t-amber-500 rounded-full animate-spin"></div>
          <Coffee className="w-4 h-4 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs text-slate-500 font-semibold mt-4 tracking-wider uppercase animate-pulse">
          Starting AS DEV STUDIO Server...
        </p>
      </div>
    );
  }

  // A. If the user has scanned a table (or active session exists) and is in Guest mode
  if (view === "guest" && tableId !== null) {
    return (
      <div className="relative min-h-screen bg-slate-50">
        <CustomerView tableId={tableId} />
      </div>
    );
  }

  // B. Management Portal (Admin Login / Admin Dashboard View)
  return (
    <div className="min-h-screen bg-slate-50">
      {adminUser ? (
        <AdminDashboard owner={adminUser} onLogout={handleLogout} />
      ) : (
        <div className="relative">
          <AdminLogin onLoginSuccess={handleLoginSuccess} />
          
          {/* Subtle link to return to table session if available */}
          {tableId !== null && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <button
                onClick={() => setView("guest")}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm cursor-pointer"
              >
                <TableProperties className="w-3.5 h-3.5 text-amber-500" />
                Return to Table #{tableId} Order Screen
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
