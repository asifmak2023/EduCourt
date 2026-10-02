import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, type AuthUser } from "./api";

export interface CampusOption {
  id: number;
  name: string;
  code?: string | null;
}

interface CampusContextValue {
  campuses: CampusOption[];
  campusId: number | null;
  campus: CampusOption | null;
  setCampusId: (id: number) => void;
  loading: boolean;
  canSwitch: boolean;
}

const CampusContext = createContext<CampusContextValue | null>(null);

export function CampusProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  const [loaded, setLoaded] = useState<{
    userId: number | null;
    campuses: CampusOption[];
  }>({ userId: null, campuses: [] });
  const [chosen, setChosen] = useState<{
    userId: number | null;
    id: number | null;
  }>({ userId: null, id: null });

  const fallback = useMemo<CampusOption[]>(
    () =>
      user?.campus
        ? [{ id: user.campus.id, name: user.campus.name }]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.campus?.id, user?.campus?.name]
  );

  useEffect(() => {
    if (!user) {
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
          campuses: response.data?.length ? response.data : fallback,
        });
      })
      .catch(() => {
        if (active) {
          setLoaded({ userId: user.id, campuses: fallback });
        }
      });

    return () => {
      active = false;
    };
  }, [user, fallback]);

  const campuses = useMemo<CampusOption[]>(
    () =>
      !user
        ? []
        : loaded.userId === user.id && loaded.campuses.length
        ? loaded.campuses
        : fallback,
    [user, loaded, fallback]
  );
  const defaultCampusId = user?.campus?.id ?? fallback[0]?.id ?? null;
  const campusId =
    !user
      ? null
      : chosen.userId === user.id && chosen.id !== null
      ? chosen.id
      : defaultCampusId;
  const loading = Boolean(user) && loaded.userId !== user?.id;

  const value = useMemo<CampusContextValue>(
    () => ({
      campuses,
      campusId,
      campus: campuses.find((entry) => entry.id === campusId) ?? null,
      setCampusId: (id) => setChosen({ userId: user?.id ?? null, id }),
      loading,
      canSwitch: campuses.length > 1,
    }),
    [campuses, campusId, loading, user?.id]
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus(): CampusContextValue {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error("useCampus must be used within a CampusProvider");
  }
  return context;
}

export function useCampusId(): number | null {
  return useCampus().campusId;
}
