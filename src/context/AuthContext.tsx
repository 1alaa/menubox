import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getIdTokenResult, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserDoc } from "../types";

export type AppRole = "owner" | "superadmin";

interface AuthContextType {
  user: User | null;
  userDoc: UserDoc | null;
  role: AppRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDoc: null,
  role: null,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const userDocUnsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // cleanup old listener
      if (userDocUnsubRef.current) {
        userDocUnsubRef.current();
        userDocUnsubRef.current = null;
      }

      setUser(firebaseUser);
      setUserDoc(null);
      setRole(null);
      setLoading(true);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      // 1) اقرأ claims مرة (لـ superadmin)
      try {
        const token = await getIdTokenResult(firebaseUser, true);
        const claims: any = token?.claims || {};
        if (claims?.role === "superadmin" || claims?.superadmin === true) setRole("superadmin");
        else if (claims?.role === "owner") setRole("owner");
      } catch (e) {
        console.warn("Could not read token claims", e);
      }

      // 2) Subscribe على users/{uid} حتى isVerified تتحدث فوراً بعد verify
      const uRef = doc(db, "users", firebaseUser.uid);

      userDocUnsubRef.current = onSnapshot(
        uRef,
        async (snap) => {
          try {
            if (snap.exists()) {
              const data = snap.data() as UserDoc;

              // Backward compatibility
              const normalized: UserDoc = { ...data, isVerified: data.isVerified ?? true };

              setUserDoc(normalized);
              setRole((prev) => prev || ((normalized.role as AppRole | undefined) ?? null));
              setLoading(false);
              return;
            }

            // إذا ما في doc (أول مرة): انشئه مرة وحدة
            const newUser: UserDoc = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "owner",
              isVerified: false,
              createdAt: Timestamp.now(),
            };

            // تأكد ما نعمل setDoc بشكل متكرر:
            const existsNow = await getDoc(uRef);
            if (!existsNow.exists()) {
              await setDoc(uRef, newUser);
            }

            // snapshot رح يشتغل لحاله بعد setDoc
          } catch (e) {
            console.error("Failed to sync user doc", e);
            setLoading(false);
          }
        },
        (err) => {
          console.error("User doc listener error", err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (userDocUnsubRef.current) userDocUnsubRef.current();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);