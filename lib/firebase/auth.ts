import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { getFirebaseServices } from "./client";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const FIREBASE_UNCONFIGURED_ERROR = "Firebase is not configured";

function requireAuth() {
  const services = getFirebaseServices();
  if (!services) throw new Error(FIREBASE_UNCONFIGURED_ERROR);
  return services.auth;
}

export function signInWithGoogle() {
  return signInWithPopup(requireAuth(), googleProvider);
}

export function signOutUser() {
  return signOut(requireAuth());
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(services.auth, callback);
}

export function getCurrentUser(): User | null {
  return getFirebaseServices()?.auth.currentUser ?? null;
}
