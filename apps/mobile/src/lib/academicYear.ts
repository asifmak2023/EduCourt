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

export function parseAcademicYearStart(year: AcademicYearLike): number | null {
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

export function academicYearName(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

export function academicYearDates(startYear: number): {
  starts_on: string;
  ends_on: string;
} {
  return {
    starts_on: `${startYear}-04-01`,
    ends_on: `${startYear + 1}-03-31`,
  };
}

function inferCalendarAcademicYearStart(now = new Date()): number {
  const year = now.getFullYear();
  return now.getMonth() >= 3 ? year : year - 1;
}

export function currentAcademicYearStart(years: readonly AcademicYearLike[]): number {
  const current = years.find((year) => year.is_current);
  const fromCurrent = current ? parseAcademicYearStart(current) : null;
  if (fromCurrent !== null) {
    return fromCurrent;
  }

  const starts = years
    .map((year) => parseAcademicYearStart(year))
    .filter((start): start is number => start !== null);

  if (starts.length > 0) {
    return Math.max(...starts);
  }

  return inferCalendarAcademicYearStart();
}

export function relativeAcademicYearStarts(
  years: readonly AcademicYearLike[],
  before: number,
  after: number
): number[] {
  const current = currentAcademicYearStart(years);
  const starts: number[] = [];

  for (let year = current - before; year <= current + after; year += 1) {
    starts.push(year);
  }

  return starts;
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

export const PENDING_YEAR_PREFIX = "__pending_";

export function nearbyAcademicYearOptions<T extends AcademicYearLike>(
  years: readonly T[],
  before: number,
  after: number,
  canCreate: boolean
): Array<T | { value: string; label: string; is_current?: boolean }> {
  const starts = relativeAcademicYearStarts(years, before, after);
  const byStart = new Map<number, T>();

  for (const year of years) {
    const start = parseAcademicYearStart(year);
    if (start !== null && !byStart.has(start)) {
      byStart.set(start, year);
    }
  }

  const result: Array<T | { value: string; label: string; is_current?: boolean }> = [];

  for (const start of starts) {
    const existing = byStart.get(start);
    if (existing) {
      result.push(existing);
      continue;
    }

    if (canCreate) {
      result.push({
        value: `${PENDING_YEAR_PREFIX}${start}`,
        label: academicYearName(start),
      });
    }
  }

  return result;
}

export function pendingAcademicYearStart(value: unknown): number | null {
  const text = String(value ?? "");
  if (!text.startsWith(PENDING_YEAR_PREFIX)) {
    return null;
  }

  const start = Number(text.slice(PENDING_YEAR_PREFIX.length));
  return Number.isInteger(start) ? start : null;
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
