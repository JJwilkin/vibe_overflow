"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

interface User {
  id: number;
  username: string;
  displayName: string;
  reputation: number;
}

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  openAuth: (mode: "login" | "signup") => void;
  /** Call this to require auth before an action. Returns true if already logged in, otherwise opens the modal. */
  requireAuth: () => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  openAuth: () => {},
  requireAuth: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState<"login" | "signup" | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);

  const openAuth = useCallback((mode: "login" | "signup") => {
    setShowAuth(mode);
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setShowAuth("login");
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, openAuth, requireAuth }}>
      {children}
      {showAuth && (
        <AuthModal
          mode={showAuth}
          onClose={() => setShowAuth(null)}
          onSuccess={(u) => {
            setUser(u);
            setShowAuth(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}
