import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { VerificationCodeInput } from "../components/VerificationCodeInput";
import { resendEmailVerification, verifyEmailCode } from "../services/verification";
import { MailCheck, RefreshCw } from "lucide-react";

const COOLDOWN_SEC = 60;

const VerifyEmailPage: React.FC = () => {
  const nav = useNavigate();
  const user = auth.currentUser;

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [timeLeft, setTimeLeft] = useState<number>(0);

  const uid = user?.uid || "";

  useEffect(() => {
    let t: any;
    if (timeLeft > 0) {
      t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    }
    return () => t && clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        if (!user) {
          nav("/admin/login");
          return;
        }

        const uSnap = await getDoc(doc(db, "users", user.uid));
        const u = uSnap.data() as any;
        setEmail(user.email || u?.email || "");

        // if already verified, go admin
        if (u?.isVerified) {
          nav("/admin");
          return;
        }

        // pull lastSentAt to calculate cooldown
        const vSnap = await getDoc(doc(db, "email_verifications", user.uid));
        if (vSnap.exists()) {
          const v: any = vSnap.data();
          const lastMs = v.lastSentAt?.toMillis?.() ?? 0;
          const diff = Date.now() - lastMs;
          const left = Math.max(0, COOLDOWN_SEC - Math.floor(diff / 1000));
          setTimeLeft(left);
        } else {
          // no record (edge case) – allow resend immediately
          setTimeLeft(0);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load verification state");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [nav, user]);

  const canResend = useMemo(() => timeLeft === 0 && !sending, [timeLeft, sending]);

  const onComplete = async (code: string) => {
    if (!uid) return;
    setVerifying(true);
    setError("");
    setSuccess("");
    try {
      await verifyEmailCode(uid, code);
      setSuccess("Verified! Redirecting…");
      nav("/admin");
    } catch (e: any) {
      const msg = e?.message || "Verification failed";
      setError(
        msg === "INVALID_CODE"
          ? "Invalid code. Please try again."
          : msg === "CODE_EXPIRED"
          ? "Code expired. Please resend."
          : msg
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!uid) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      await resendEmailVerification(uid, "Menubox");
      setTimeLeft(COOLDOWN_SEC);
      setSuccess("New code sent to your email.");
    } catch (e: any) {
      const msg = e?.message || "Resend failed";
      setError(
        msg === "TOO_SOON"
          ? "Please wait a bit before resending."
          : msg === "TOO_MANY_REQUESTS"
          ? "Too many requests. Try again later."
          : msg
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-100">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-600 p-3 rounded-2xl mb-4">
            <MailCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
          <p className="text-stone-500 mt-2 text-center">
            We sent a 6-digit code to <span className="font-semibold text-stone-700">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-4 text-sm font-medium border border-emerald-100">
            {success}
          </div>
        )}

        <VerificationCodeInput onComplete={onComplete} disabled={verifying} />

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleResend}
            disabled={!canResend}
            className="text-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={"w-4 h-4 " + (sending ? "animate-spin" : "")} />
            {timeLeft > 0 ? `Resend in ${timeLeft}s` : "Resend code"}
          </button>

          <button
            onClick={() => nav("/admin/login")}
            className="text-stone-500 font-semibold hover:underline"
          >
            Back to login
          </button>
        </div>

        <p className="mt-6 text-xs text-stone-500 text-center">
          Didn’t get the email? Check your spam folder.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
