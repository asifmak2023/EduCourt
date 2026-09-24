"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, TOKEN_KEY } from "./api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  campus_id: number | null;
  institution_id: number | null;
  two_factor_enabled: boolean;
  campus?: { id: number; name: string } | null;
  institution?: { id: number; name: string } | null;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch<{ data: AuthUser }>("/v1/auth/me");
      setUser(response.data);
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      await Promise.resolve();
      if (active) {
        await loadProfile();
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch<LoginResponse>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout; clear the local session regardless.
    }
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
