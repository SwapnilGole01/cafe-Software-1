import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase.ts";
import { api, setAuthToken } from "../lib/api.ts";
import { Coffee, ShieldCheck, Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const data = await api.register(email, password);
        onLoginSuccess(data.owner);
      } else {
        const data = await api.login(email, password);
        onLoginSuccess(data.owner);
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      
      // Save Firebase token as auth token for backend verification
      setAuthToken(token);

      // Verify session with backend to check if the user is authorized in whitelist
      try {
        const me = await api.checkMe();
        onLoginSuccess(me.user);
      } catch (beErr: any) {
        // Backend rejected the token (not in whitelist)
        setAuthToken(null);
        setError(beErr.message || "Your email is not authorized as an owner.");
      }
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      setError(err.message || "Google Sign-In failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-400 p-1 rounded-full">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 mb-4 shadow-lg shadow-amber-500/20">
            <Coffee className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">AS DEV STUDIO</h1>
          <p className="text-slate-400 text-sm mt-1">Management Portal Control Console</p>
        </div>

        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 font-medium">{error}</div>
            </motion.div>
          )}

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Manager Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@cafe.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Secure Account Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-slate-900/10 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {isRegistering ? "Register New Account" : "Access Console"}
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
              Or Authenticate with
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 py-3 border border-slate-200 hover:bg-slate-50 font-medium text-sm rounded-xl transition-all cursor-pointer bg-white text-slate-700"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-1.2-1.03-2.54-1.03-3.73z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 text-center text-xs">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
            >
              {isRegistering
                ? "Already have an account? Log in"
                : "Registering as a new café owner? Create account"}
            </button>
          </div>


        </div>
      </motion.div>
    </div>
  );
}
