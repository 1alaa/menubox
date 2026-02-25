import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";

export async function forgotPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}
