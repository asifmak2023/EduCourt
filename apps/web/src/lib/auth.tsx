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
  phone?: string | null;
  job_title?: string | null;
  employee_code?: string | null;
  roles: string[];
  permissions: string[];
  campus_id: number | null;
  institution_id: number | null;
  two_factor_enabled: boolean;
  photo_url?: string | null;
  campus?: { id: number; name: string } | null;
  institution?: { id: number; name: string } | null;
}

interface TokenResponse {
  token: string;
  user: AuthUser;
}

interface ChallengeResponse {
  two_factor_required: true;
  challenge_token: string;
  expires_in: number;
}

export type LoginResult =
  | { status: "authenticated" }
  | { status: "two_factor_required"; challengeToken: string };

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string | null) => boolean;
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

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const response = await apiFetch<TokenResponse | ChallengeResponse>(
        "/v1/auth/login",
        {
          method: "POST",
          body: { email, password },
        }
      );

      if ("two_factor_required" in response) {
        return {
          status: "two_factor_required",
          challengeToken: response.challenge_token,
        };
      }

      window.localStorage.setItem(TOKEN_KEY, response.token);
      setUser(response.user);

      return { status: "authenticated" };
    },
    []
  );

  const verifyTwoFactor = useCallback(
    async (challengeToken: string, code: string) => {
      const response = await apiFetch<TokenResponse>("/v1/auth/two-factor/challenge", {
        method: "POST",
        body: { challenge_token: challengeToken, code },
      });

      window.localStorage.setItem(TOKEN_KEY, response.token);
      setUser(response.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout; clear the local session regardless.
    }
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string | null) => {
      if (permission === null) {
        return true;
      }

      return user?.permissions.includes(permission) ?? false;
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, verifyTwoFactor, logout, refresh: loadProfile, can }),
    [user, loading, login, verifyTwoFactor, logout, loadProfile, can]
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
