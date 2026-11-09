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
import { fetchChildren, childName, classLabel } from "./portal";
import type { Child } from "./types";

const STORAGE_KEY = "family.activeStudent";

interface FamilyContextValue {
  children: Child[];
  activeChildId: number | null;
  setActiveChildId: (id: number) => void;
  activeChild: Child | null;
  loading: boolean;
  error: string | null;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children: content }: { children: ReactNode }) {
  const [students, setStudents] = useState<Child[]>([]);
  const [activeChildId, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchChildren()
      .then((list) => {
        if (!active) {
          return;
        }
        setStudents(list);
        setError(list.length === 0 ? "no-children" : null);

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
        if (active) {
          setError("load-failed");
        }
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

  const setActiveChildId = useCallback((id: number) => {
    setActive(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(
    () => ({
      children: students,
      activeChildId,
      setActiveChildId,
      activeChild:
        students.find((student) => student.id === activeChildId) ?? null,
      loading,
      error,
    }),
    [students, activeChildId, setActiveChildId, loading, error]
  );

  return <FamilyContext.Provider value={value}>{content}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext);

  if (context === null) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }

  return context;
}

export { childName, classLabel };
