import React, { createContext, useContext, useEffect, useState } from "react";
import { getIdTokenResult, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setUserDoc(null);
      setRole(null);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      try {
        // 1) Read custom claims (recommended for Super Admin)
        // Example:
        //   { superadmin: true }
        //   { role: 'superadmin' }
        try {
          const token = await getIdTokenResult(firebaseUser, true);
          const claims: any = token?.claims || {};
          if (claims?.role === "superadmin" || claims?.superadmin === true) setRole("superadmin");
          else if (claims?.role === "owner") setRole("owner");
        } catch (e) {
          console.warn("Could not read token claims", e);
        }

        // 2) Read users/{uid} doc (fallback role + restaurantId)
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as UserDoc;
          // Backward compatibility: old accounts without isVerified are treated as verified
          const normalized: UserDoc = { ...data, isVerified: data.isVerified ?? true };
          setUserDoc(normalized);
          setRole((prev) => prev || ((data.role as AppRole | undefined) ?? null));
        } else {
          // Create default user doc for new signups
          const newUser: UserDoc = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            role: "owner",
            isVerified: false,
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newUser);
          setUserDoc(newUser);
          setRole((prev) => prev || "owner");
        }
      } catch (e) {
        console.error("Failed to load user doc", e);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
