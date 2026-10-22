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

  const pendingStarts = useMemo(
    () => (canCreate ? nextAcademicYearStarts(known) : []),
    [canCreate, known]
  );

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
        {known.map((year) => (
          <option key={year.id} value={String(year.id)}>
            {year.name}
          </option>
        ))}
        {pendingStarts.map((start) => (
          <option key={`${PENDING_PREFIX}${start}`} value={`${PENDING_PREFIX}${start}`}>
            {academicYearName(start)}
          </option>
        ))}
        {canCreate ? (
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
