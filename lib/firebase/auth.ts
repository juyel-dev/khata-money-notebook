import {
  GoogleAuthProvider,
  getRedirectResult,
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

  // Redirect is more reliable than popups on mobile browsers and installed
  // mobile PWAs. Desktop browsers — including installed desktop PWAs — use
  // popup instead: the Firebase redirect flow keeps its continuation state
  // in sessionStorage, which does not survive the cross-origin round-trip
  // from an installed desktop PWA window, so the sign-in silently never
  // completes there. Popup keeps the opener window alive instead.
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function signInWithGoogle() {
  const auth = requireAuth();
  return shouldUseRedirectAuth()
    ? signInWithRedirect(auth, googleProvider)
    : signInWithPopup(auth, googleProvider);
}

export function resolveRedirectSignIn() {
  const services = getFirebaseServices();
  if (!services) return Promise.resolve(null);
  return getRedirectResult(services.auth);
}

export function signOutUser() {
  return signOut(requireAuth());
}

export function observeAuthState(
  callback: (user: User | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(services.auth, callback, onError);
}

export function getCurrentUser(): User | null {
  return getFirebaseServices()?.auth.currentUser ?? null;
}
