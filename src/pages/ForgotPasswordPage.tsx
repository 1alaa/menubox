import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/forgotPassword";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

const ForgotPasswordPage: React.FC = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      await forgotPassword(email);
      setMsg("Reset link sent. Please check your email.");
    } catch (e: any) {
      setErr(e?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-100">
        <button onClick={() => nav("/admin/login")} className="text-stone-500 font-semibold flex items-center gap-2 mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="text-stone-500 mt-2">Enter your email and we’ll send you a reset link.</p>

        {err && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mt-4 text-sm font-medium border border-red-100">
            {err}
          </div>
        )}
        {msg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mt-4 text-sm font-medium border border-emerald-100">
            {msg}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
