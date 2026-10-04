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
import { fetchChildren, type PortalStudent } from "./portal";

const STORAGE_KEY = "eis.portal.student";

interface PortalContextValue {
  students: PortalStudent[];
  activeStudentId: number | null;
  setActiveStudentId: (id: number) => void;
  activeStudent: PortalStudent | null;
  loading: boolean;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<PortalStudent[]>([]);
  const [activeStudentId, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchChildren()
      .then((list) => {
        if (!active) {
          return;
        }
        setStudents(list);

        let stored: number | null = null;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          stored = raw ? Number(raw) : null;
        } catch {
          stored = null;
        }

        const valid =
          stored && list.some((student) => student.id === stored)
            ? stored
            : (list[0]?.id ?? null);
        setActive(valid);
      })
      .catch(() => {
        // Errors are surfaced by the individual portal screens.
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setActiveStudentId = useCallback((id: number) => {
    setActive(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(
    () => ({
      students,
      activeStudentId,
      setActiveStudentId,
      activeStudent:
        students.find((student) => student.id === activeStudentId) ?? null,
      loading,
    }),
    [students, activeStudentId, setActiveStudentId, loading]
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortal(): PortalContextValue {
  const context = useContext(PortalContext);

  if (context === null) {
    throw new Error("usePortal must be used within a PortalProvider");
  }

  return context;
}
