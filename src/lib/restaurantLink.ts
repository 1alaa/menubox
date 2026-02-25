import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "./firebase";

type UserDocLite = {
  role?: string;
  restaurantId?: string;
};

/**
 * Resolve the current owner's restaurantId.
 * - First: reads users/{uid}.restaurantId
 * - Fallback: finds restaurants where ownerUid == uid, then auto-links users/{uid}.restaurantId
 */
export async function resolveOwnerRestaurantId(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = (userSnap.exists() ? (userSnap.data() as UserDocLite) : {}) as UserDocLite;

  if (userData.restaurantId) return userData.restaurantId;

  const rq = query(collection(db, "restaurants"), where("ownerUid", "==", user.uid));
  const rs = await getDocs(rq);
  if (rs.empty) return null;

  const restaurantId = rs.docs[0].id;

  await setDoc(
    userRef,
    {
      role: userData.role ?? "owner",
      restaurantId,
      updatedAt: serverTimestamp(),
      createdAt: userSnap.exists() ? undefined : serverTimestamp(),
    },
    { merge: true }
  );

  return restaurantId;
}
