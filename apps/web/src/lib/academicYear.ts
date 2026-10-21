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

export function academicYearSelectOptions(
  years: readonly { id: number | string; name: string; is_current?: boolean }[]
): { value: string; label: string; is_current: boolean }[] {
  return [...years]
    .sort((left, right) => Number(Boolean(right.is_current)) - Number(Boolean(left.is_current)))
    .map((year) => ({
      value: String(year.id),
      label: year.name,
      is_current: Boolean(year.is_current),
    }));
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
