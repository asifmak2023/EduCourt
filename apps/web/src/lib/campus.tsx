"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "@eis/i18n";
import { apiFetch, setActiveCampusResolver } from "./api";
import { useAuth, type AuthUser } from "./auth";

export interface CampusOption {
  id: number;
  name: string;
  code?: string | null;
}

const STORAGE_PREFIX = "eis.activeCampus";
const ALL_CAMPUSES = "all";

interface StoredCampus {
  present: boolean;
  id: number | null;
}

interface CampusContextValue {
  campuses: CampusOption[];
  campusId: number | null;
  campus: CampusOption | null;
  setCampusId: (id: number | null) => void;
  loading: boolean;
  canSwitch: boolean;
  canSelectAll: boolean;
}

const CampusContext = createContext<CampusContextValue | null>(null);

function storageKey(userId: number): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

function readStoredCampus(userId: number): StoredCampus {
  if (typeof window === "undefined") {
    return { present: false, id: null };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (raw === null) {
      return { present: false, id: null };
    }

    if (raw === "" || raw === ALL_CAMPUSES) {
      return { present: true, id: null };
    }

    const parsed = Number(raw);

    return Number.isFinite(parsed)
      ? { present: true, id: parsed }
      : { present: false, id: null };
  } catch {
    return { present: false, id: null };
  }
}

function writeStoredCampus(userId: number, campusId: number | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (campusId === null) {
      window.localStorage.setItem(storageKey(userId), ALL_CAMPUSES);
    } else {
      window.localStorage.setItem(storageKey(userId), String(campusId));
    }
  } catch {
    // Ignore storage failures; the selection still applies for this session.
  }
}

function isInstitutionHead(user: AuthUser): boolean {
  return user.roles.includes("institution_head");
}

function isPlatformAdmin(user: AuthUser): boolean {
  return user.roles.includes("platform_admin");
}

/*
 * Resolves the campus that should scope the signed-in user's requests.
 *
 * - Users bound to a single campus always use it and cannot switch.
 * - Institution heads browse campus by campus; they default to the first
 *   campus (or their last choice) because academic operations require an
 *   explicit campus.
 * - Platform admins keep the platform-wide view by default and may drill into
 *   a single campus from the switcher.
 */
function resolveCampusId(
  user: AuthUser,
  campuses: CampusOption[]
): number | null {
  if (user.campus_id !== null) {
    return user.campus_id;
  }

  const stored = readStoredCampus(user.id);

  if (stored.present) {
    return stored.id !== null &&
      campuses.some((campus) => campus.id === stored.id)
      ? stored.id
      : null;
  }

  if (isPlatformAdmin(user)) {
    return null;
  }

  return campuses[0]?.id ?? null;
}

export function CampusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState<{
    userId: number | null;
    campuses: CampusOption[];
  }>({ userId: null, campuses: [] });

  const boundCampus = user?.campus ?? null;
  const headWithoutCampus =
    Boolean(user) && isInstitutionHead(user as AuthUser) && user?.campus_id === null;

  useEffect(() => {
    if (!user || user.campus_id !== null) {
      return;
    }

    let active = true;

    apiFetch<{ data: CampusOption[] }>("/v1/campuses?per_page=200")
      .then((response) => {
        if (!active) {
          return;
        }

        setLoaded({
          userId: user.id,
          campuses: response.data ?? [],
        });
      })
      .catch(() => {
        if (active) {
          setLoaded({ userId: user.id, campuses: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  const campuses = useMemo<CampusOption[]>(() => {
    if (!user) {
      return [];
    }

    if (user.campus_id !== null) {
      return boundCampus
        ? [{ id: boundCampus.id, name: boundCampus.name }]
        : [];
    }

    return loaded.userId === user.id ? loaded.campuses : [];
  }, [user, boundCampus, loaded]);

  const ready = !user || !headWithoutCampus || loaded.userId === user.id;
  const campusId = user ? resolveCampusId(user, campuses) : null;

  // Registered during render so child effects (which run before this
  // component's effects) already see the selected campus on their first fetch.
  if (typeof window !== "undefined") {
    setActiveCampusResolver(() => campusId);
  }

  useEffect(() => {
    return () => setActiveCampusResolver(null);
  }, []);

  const setCampusId = useCallback(
    (id: number | null) => {
      if (!user) {
        return;
      }

      writeStoredCampus(user.id, id);

      if (typeof window !== "undefined") {
        // A hard reload guarantees every cached query and hook refetches with
        // the new campus, without tracking the selection in every hook.
        window.location.reload();
      }
    },
    [user]
  );

  const value = useMemo<CampusContextValue>(() => {
    const canSwitch = Boolean(user) && campuses.length > 1;

    return {
      campuses,
      campusId,
      campus: campuses.find((entry) => entry.id === campusId) ?? null,
      setCampusId,
      loading: Boolean(user) && !ready,
      canSwitch:
        canSwitch &&
        Boolean(user) &&
        (isInstitutionHead(user as AuthUser) || isPlatformAdmin(user as AuthUser)),
      canSelectAll:
        Boolean(user) &&
        (isInstitutionHead(user as AuthUser) || isPlatformAdmin(user as AuthUser)),
    };
  }, [campuses, campusId, ready, setCampusId, user]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        {t("app.loading")}
      </div>
    );
  }

  return (
    <CampusContext.Provider value={value}>{children}</CampusContext.Provider>
  );
}

export function useCampus(): CampusContextValue {
  const context = useContext(CampusContext);

  if (!context) {
    throw new Error("useCampus must be used within a CampusProvider");
  }

  return context;
}

export function useActiveCampusId(): number | null {
  return useCampus().campusId;
}
