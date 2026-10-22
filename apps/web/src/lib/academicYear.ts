"use client";

import { useEffect, useRef } from "react";

export const emptyAcademicYears: readonly { id: number | string; is_current?: boolean }[] =
  [];

export function currentAcademicYearId(
  years: readonly { id: number | string; is_current?: boolean }[]
): string {
  const year = years.find((item) => item.is_current) ?? years[0];
  return year ? String(year.id) : "";
}

export type AcademicYearLike = {
  id: number | string;
  name: string;
  starts_on?: string | null;
  is_current?: boolean;
};

const NAME_RE = /^(\d{4})\s*[-/]\s*(\d{4})$/;

export function academicYearSelectOptions(
  years: readonly { id: number | string; name: string; is_current?: boolean }[]
): { value: string; label: string; is_current: boolean }[] {
  return years.map((year) => ({
    value: String(year.id),
    label: year.name,
    is_current: Boolean(year.is_current),
  }));
}

export function parseAcademicYearStart(year: AcademicYearLike | string): number | null {
  const name = typeof year === "string" ? year : year.name;
  const match = name.match(NAME_RE);
  if (match) {
    return Number(match[1]);
  }

  if (typeof year !== "string" && year.starts_on) {
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

export function inferCalendarAcademicYearStart(now = new Date()): number {
  const year = now.getFullYear();
  return now.getMonth() >= 3 ? year : year - 1;
}

export function currentAcademicYearStart(
  years: readonly AcademicYearLike[]
): number {
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

function existingStarts(years: readonly AcademicYearLike[]): Set<number> {
  return new Set(
    years
      .map((year) => parseAcademicYearStart(year))
      .filter((start): start is number => start !== null)
  );
}

export function nextAcademicYearStarts(
  years: readonly AcademicYearLike[],
  count = 5
): number[] {
  const known = existingStarts(years);
  const result: number[] = [];

  for (let year = currentAcademicYearStart(years) + 1; result.length < count; year += 1) {
    if (!known.has(year)) {
      result.push(year);
    }
  }

  return result;
}

export function nextUnusedAcademicYearStart(
  years: readonly AcademicYearLike[],
  reserved: readonly number[] = []
): number {
  const known = existingStarts(years);
  for (const year of reserved) {
    known.add(year);
  }

  let year = currentAcademicYearStart(years) + 1;
  while (known.has(year)) {
    year += 1;
  }

  return year;
}

export function sortAcademicYears<T extends AcademicYearLike>(years: readonly T[]): T[] {
  return [...years].sort((left, right) => {
    const leftStart = parseAcademicYearStart(left) ?? 0;
    const rightStart = parseAcademicYearStart(right) ?? 0;
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    return left.name.localeCompare(right.name);
  });
}

export function useAcademicYearDefault(
  years: readonly { id: number | string; is_current?: boolean }[],
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
