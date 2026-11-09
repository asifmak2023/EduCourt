"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "./api";
import type { PortfolioUser } from "./types";

export const PORTAL_ROLES = new Set(["student", "parent_guardian"]);

export function isPortalOnly(roles: readonly string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }
  return roles.every((role) => PORTAL_ROLES.has(role));
}

interface SessionResponse {
  user: PortfolioUser;
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
  user: PortfolioUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortfolioUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const response = await apiFetch<{ data: PortfolioUser }>("/v1/auth/me");
      setUser(response.data);
    } catch {
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
      const response = await apiFetch<SessionResponse | ChallengeResponse>(
        "/v1/auth/login",
        {
          method: "POST",
          body: { email, password, device_name: "family-web" },
        }
      );

      if ("two_factor_required" in response) {
        return {
          status: "two_factor_required",
          challengeToken: response.challenge_token,
        };
      }

      setUser(response.user);
      return { status: "authenticated" };
    },
    []
  );

  const verifyTwoFactor = useCallback(
    async (challengeToken: string, code: string) => {
      const response = await apiFetch<SessionResponse>(
        "/v1/auth/two-factor/challenge",
        {
          method: "POST",
          body: {
            challenge_token: challengeToken,
            code,
            device_name: "family-web",
          },
        }
      );

      setUser(response.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network failures; the cookie is cleared server-side anyway.
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, verifyTwoFactor, logout, refresh: loadProfile }),
    [user, loading, login, verifyTwoFactor, logout, loadProfile]
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
