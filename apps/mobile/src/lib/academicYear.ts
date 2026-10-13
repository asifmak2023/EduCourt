import { useEffect, useRef } from "react";

const EMPTY_YEARS: readonly {
  id?: number | string;
  value?: number | string;
  is_current?: boolean;
}[] = [];

export const emptyAcademicYears = EMPTY_YEARS;

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
