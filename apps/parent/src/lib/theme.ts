"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "family.theme";

function apply(dark: boolean) {
  const root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem(KEY) ?? "system";
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored === "dark" || (stored === "system" && system);
  });

  useEffect(() => {
    apply(dark);
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(KEY, next ? "dark" : "light");
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  return { dark, toggle };
}
