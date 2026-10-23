import { useEffect, useRef } from "react";

const EMPTY_YEARS: readonly {
  id?: number | string;
  value?: number | string;
  is_current?: boolean;
}[] = [];

export const emptyAcademicYears = EMPTY_YEARS;

export type AcademicYearLike = {
  id?: number | string;
  value?: number | string;
  name?: string;
  label?: string;
  starts_on?: string | null;
  is_current?: boolean;
};

const NAME_RE = /^(\d{4})\s*[-/]\s*(\d{4})$/;

function parseAcademicYearStart(year: AcademicYearLike): number | null {
  const name = year.name ?? year.label ?? "";
  const match = name.match(NAME_RE);
  if (match) {
    return Number(match[1]);
  }

  if (year.starts_on) {
    const stamp = Date.parse(year.starts_on);
    if (!Number.isNaN(stamp)) {
      return new Date(stamp).getUTCFullYear();
    }
  }

  return null;
}

export function sortAcademicYears<T extends AcademicYearLike>(years: readonly T[]): T[] {
  return [...years].sort((left, right) => {
    const leftStart = parseAcademicYearStart(left) ?? 0;
    const rightStart = parseAcademicYearStart(right) ?? 0;
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    return (left.name ?? left.label ?? "").localeCompare(right.name ?? right.label ?? "");
  });
}

export function relativeAcademicYears<T extends AcademicYearLike>(
  years: readonly T[],
  before: number,
  after: number
): T[] {
  const sorted = sortAcademicYears(years);

  if (sorted.length === 0) {
    return [];
  }

  let currentIndex = sorted.findIndex((year) => year.is_current);

  if (currentIndex < 0) {
    currentIndex = sorted.length - 1;
  }

  const start = Math.max(0, currentIndex - before);
  const end = Math.min(sorted.length, currentIndex + after + 1);

  return sorted.slice(start, end);
}

export function currentAcademicYearId(
  years: readonly { id?: number | string; value?: number | string; is_current?: boolean }[]
): string {
  const year = years.find((item) => item.is_current) ?? years[0];
  if (!year) {
    return "";
  }
  const id = year.id ?? year.value;
  return id === undefined || id === null ? "" : String(id);
}

export function useAcademicYearDefault(
  years: readonly { id?: number | string; value?: number | string; is_current?: boolean }[],
  value: string,
  setValue: (next: string) => void
): void {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) {
      return;
    }

    if (value) {
      applied.current = true;
      return;
    }

    const id = currentAcademicYearId(years);
    if (!id) {
      return;
    }

    applied.current = true;
    setValue(id);
  }, [years, value, setValue]);
}
