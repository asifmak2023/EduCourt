"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Select } from "@/components/Form";
import { AcademicYearQuickCreateDialog } from "@/components/AcademicYearQuickCreateDialog";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  academicYearDates,
  academicYearName,
  nextAcademicYearStarts,
  parseAcademicYearStart,
  relativeAcademicYearStarts,
  sortAcademicYears,
} from "@/lib/academicYear";
import type { AcademicYear } from "@/lib/types";

const PENDING_PREFIX = "__pending_";
const NEW_SESSION_VALUE = "__new_session__";

export function AcademicYearSelect({
  id,
  name,
  value,
  years,
  extraYears = [],
  placeholder = "Optional",
  disabled,
  required,
  nearby,
  showNewSession = true,
  onChange,
  onCreated,
}: {
  id?: string;
  name?: string;
  value: string;
  years: readonly AcademicYear[];
  extraYears?: readonly AcademicYear[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  nearby?: { before: number; after: number };
  showNewSession?: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onCreated?: (year: AcademicYear) => void;
}) {
  const { can } = useAuth();
  const canCreate = can("academic.create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const known = useMemo(() => {
    const map = new Map<number, AcademicYear>();
    for (const year of years) {
      map.set(year.id, year);
    }
    for (const year of extraYears) {
      map.set(year.id, year);
    }
    return sortAcademicYears([...map.values()]);
  }, [years, extraYears]);

  const nearbyBefore = nearby?.before;
  const nearbyAfter = nearby?.after;
  const windowStarts = useMemo(
    () =>
      nearbyBefore === undefined || nearbyAfter === undefined
        ? null
        : relativeAcademicYearStarts(known, nearbyBefore, nearbyAfter),
    [known, nearbyBefore, nearbyAfter]
  );

  const displayed = useMemo(() => {
    if (!windowStarts) {
      return known;
    }

    return known.filter((year) => {
      const start = parseAcademicYearStart(year);
      return start !== null && windowStarts.includes(start);
    });
  }, [known, windowStarts]);

  const pendingStarts = useMemo(() => {
    if (!canCreate) {
      return [];
    }

    if (windowStarts) {
      const existing = new Set(
        known
          .map((year) => parseAcademicYearStart(year))
          .filter((start): start is number => start !== null)
      );
      return windowStarts.filter((start) => !existing.has(start));
    }

    return nextAcademicYearStarts(known);
  }, [canCreate, known, windowStarts]);

  const emit = (next: string) => {
    onChange({
      target: { value: next, name },
    } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  const createYear = async (startYear: number) => {
    const label = academicYearName(startYear);
    setCreating(label);
    setError(null);

    try {
      const response = await apiFetch<{ data: AcademicYear }>(
        "/v1/academic-years",
        {
          method: "POST",
          body: {
            name: label,
            ...academicYearDates(startYear),
            status: "draft",
            is_current: false,
          },
        }
      );
      onCreated?.(response.data);
      emit(String(response.data.id));
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to create session."
      );
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <Select
        id={id}
        name={name}
        value={value}
        disabled={disabled || creating !== null}
        required={required}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NEW_SESSION_VALUE) {
            setDialogOpen(true);
            return;
          }
          if (next.startsWith(PENDING_PREFIX)) {
            void createYear(Number(next.slice(PENDING_PREFIX.length)));
            return;
          }
          emit(next);
        }}
      >
        <option value="">{placeholder}</option>
        {sortAcademicYears([
          ...displayed.map((year) => ({
            id: String(year.id),
            name: year.name,
            starts_on: year.starts_on,
          })),
          ...pendingStarts.map((start) => ({
            id: `${PENDING_PREFIX}${start}`,
            name: academicYearName(start),
            starts_on: academicYearDates(start).starts_on,
          })),
        ]).map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
        {canCreate && showNewSession ? (
          <option value={NEW_SESSION_VALUE}>New session</option>
        ) : null}
      </Select>
      {creating ? (
        <p className="text-xs text-muted">Creating {creating}...</p>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <AcademicYearQuickCreateDialog
        open={dialogOpen}
        years={known}
        reservedStarts={pendingStarts}
        onClose={() => setDialogOpen(false)}
        onCreated={(year) => {
          onCreated?.(year);
          emit(String(year.id));
        }}
      />
    </div>
  );
}
