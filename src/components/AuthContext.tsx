"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";

interface User {
  id: number;
  username: string;
  displayName: string;
  reputation: number;
  isAnonymous?: boolean;
}

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  openAuth: (mode: "login" | "signup") => void;
  /** Ensures a user session exists. Creates an anonymous user if needed. Returns true if user is ready. */
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
  const creatingAnon = useRef(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);

  const openAuth = useCallback((mode: "login" | "signup") => {
    setShowAuth(mode);
  }, []);

  const createAnonymousUser = useCallback(async () => {
    if (creatingAnon.current) return;
    creatingAnon.current = true;
    try {
      const res = await fetch("/api/auth/anonymous", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } finally {
      creatingAnon.current = false;
    }
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    // Silently create anonymous user
    createAnonymousUser();
    return false;
  }, [user, createAnonymousUser]);

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
