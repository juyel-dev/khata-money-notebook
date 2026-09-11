import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "./config";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestore: Firestore | null = null;

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function getFirebaseServices(): FirebaseServices | null {
  if (firebaseApp && firebaseAuth && firestore) {
    return { app: firebaseApp, auth: firebaseAuth, firestore };
  }

  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth, firestore };
  } catch {
    firebaseApp = null;
    firebaseAuth = null;
    firestore = null;
    return null;
  }
}

export { firebaseApp, firebaseAuth, firestore };
