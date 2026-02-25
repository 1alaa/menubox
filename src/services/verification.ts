import { doc, getDoc, runTransaction, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { generate6DigitCode } from "../utils/generateCode";
import { sha256Hex } from "../utils/crypto";
import { sendVerificationEmail } from "./verificationEmail";

/**
 * Config
 */
const CODE_TTL_MIN = 10; // minutes
const RESEND_COOLDOWN_SEC = 60; // seconds
const WINDOW_SEC = 60 * 60; // 1 hour
const MAX_SEND_PER_WINDOW = 5;

export async function startEmailVerification(uid: string, email: string, appName?: string) {
  const code = generate6DigitCode();
  const codeHash = await sha256Hex(code);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + CODE_TTL_MIN * 60 * 1000);

  await runTransaction(db, async (tx) => {
    const ref = doc(db, "email_verifications", uid);
    tx.set(ref, {
      uid,
      email,
      codeHash,
      used: false,
      expiresAt,
      lastSentAt: now,
      sendCountWindowStart: now,
      sendCountInWindow: 1,
      createdAt: now,
    }, { merge: true });
  });

  await sendVerificationEmail(email, code, appName);
}

export async function resendEmailVerification(uid: string, appName?: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Not signed in");

  const newCode = generate6DigitCode();
  const newHash = await sha256Hex(newCode);

  const email = await runTransaction(db, async (tx) => {
    const ref = doc(db, "email_verifications", uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Verification record not found");
    const data: any = snap.data();

    if (data.used) throw new Error("Already verified");

    const nowMs = Date.now();
    const lastSentAtMs = data.lastSentAt?.toMillis?.() ?? 0;
    if (nowMs - lastSentAtMs < RESEND_COOLDOWN_SEC * 1000) {
      throw new Error("TOO_SOON");
    }

    const windowStartMs = data.sendCountWindowStart?.toMillis?.() ?? nowMs;
    let count = Number(data.sendCountInWindow ?? 0);
    let windowStart = data.sendCountWindowStart;

    if (nowMs - windowStartMs > WINDOW_SEC * 1000) {
      // reset window
      count = 0;
      windowStart = Timestamp.now();
    }

    if (count >= MAX_SEND_PER_WINDOW) {
      throw new Error("TOO_MANY_REQUESTS");
    }

    tx.update(ref, {
      codeHash: newHash,
      expiresAt: Timestamp.fromMillis(nowMs + CODE_TTL_MIN * 60 * 1000),
      lastSentAt: Timestamp.now(),
      sendCountWindowStart: windowStart,
      sendCountInWindow: count + 1,
    });

    return data.email as string;
  });

  await sendVerificationEmail(email, newCode, appName);
}

export async function verifyEmailCode(uid: string, inputCode: string) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Not signed in");

  const hash = await sha256Hex(inputCode);

  await runTransaction(db, async (tx) => {
    const vRef = doc(db, "email_verifications", uid);
    const uRef = doc(db, "users", uid);

    const vSnap = await tx.get(vRef);
    if (!vSnap.exists()) throw new Error("Verification record not found");
    const v: any = vSnap.data();

    if (v.used) throw new Error("ALREADY_VERIFIED");
    const expMs = v.expiresAt?.toMillis?.() ?? 0;
    if (Date.now() > expMs) throw new Error("CODE_EXPIRED");
    if (v.codeHash !== hash) throw new Error("INVALID_CODE");

    tx.update(vRef, { used: true, verifiedAt: serverTimestamp() });
    tx.update(uRef, { isVerified: true, verifiedAt: serverTimestamp() });
  });
}
