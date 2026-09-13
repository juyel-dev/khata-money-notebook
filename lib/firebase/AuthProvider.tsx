"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { observeAuthState, resolveRedirectSignIn, signInWithGoogle, signOutUser } from "./auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: () => ReturnType<typeof signInWithGoogle>;
  signOut: () => ReturnType<typeof signOutUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleError = (nextError: Error) => {
      if (!mounted) return;
      setError(nextError);
      setLoading(false);
    };

    const unsubscribe = observeAuthState((nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      setError(null);
      setLoading(false);
    }, handleError);

    void resolveRedirectSignIn().catch(handleError);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signIn: signInWithGoogle,
      signOut: signOutUser,
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
