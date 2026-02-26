import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { startEmailVerification } from "../services/verification";
import { QrCode, Mail, Lock, Loader2 } from "lucide-react";

const AdminLoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // ✅ No verification checks on login anymore
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Ensure a user doc exists with isVerified=false (NEW ACCOUNTS ONLY)
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email,
            role: "owner",
            isVerified: false,
            createdAt: Timestamp.now(),
          },
          { merge: true }
        );

        // Create verification record + send code email
        await startEmailVerification(cred.user.uid, email, "Menubox");

        navigate("/admin/verify");
        return;
      }

      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-2xl mb-4">
            <QrCode className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Menubox Admin</h1>
          <p className="text-stone-500 mt-2">
            {isLogin ? "Welcome back to your dashboard" : "Create your restaurant account"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-700 font-semibold hover:underline"
          >
            {isLogin ? "Create a new account" : "I already have an account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;