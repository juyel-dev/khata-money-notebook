"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { observeAuthState, signInWithGoogle, signOutUser } from "./auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => ReturnType<typeof signInWithGoogle>;
  signOut: () => ReturnType<typeof signOutUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: signInWithGoogle,
      signOut: signOutUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
