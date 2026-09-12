import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
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

export function shouldUseRedirectAuth(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  // Redirect is more reliable than popups for mobile browsers and installed PWAs.
  return isMobile || isStandalone;
}

export function signInWithGoogle() {
  const auth = requireAuth();
  return shouldUseRedirectAuth()
    ? signInWithRedirect(auth, googleProvider)
    : signInWithPopup(auth, googleProvider);
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
