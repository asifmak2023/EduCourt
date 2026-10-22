"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, Field, TextInput, buttonClasses } from "@/components/Form";
import { ErrorNotice } from "@/components/ui";
import {
  academicYearDates,
  academicYearName,
  nextUnusedAcademicYearStart,
  parseAcademicYearStart,
  type AcademicYearLike,
} from "@/lib/academicYear";
import type { AcademicYear } from "@/lib/types";

export function AcademicYearQuickCreateDialog({
  open,
  years,
  reservedStarts = [],
  onClose,
  onCreated,
}: {
  open: boolean;
  years: readonly AcademicYearLike[];
  reservedStarts?: readonly number[];
  onClose: () => void;
  onCreated: (year: AcademicYear) => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AcademicYearQuickCreateBody
      years={years}
      reservedStarts={reservedStarts}
      onClose={onClose}
      onCreated={onCreated}
    />,
    document.body
  );
}

function AcademicYearQuickCreateBody({
  years,
  reservedStarts,
  onClose,
  onCreated,
}: {
  years: readonly AcademicYearLike[];
  reservedStarts: readonly number[];
  onClose: () => void;
  onCreated: (year: AcademicYear) => void;
}) {
  const start = nextUnusedAcademicYearStart(years, reservedStarts);
  const dates = academicYearDates(start);
  const [name, setName] = useState(academicYearName(start));
  const [startsOn, setStartsOn] = useState(dates.starts_on);
  const [endsOn, setEndsOn] = useState(dates.ends_on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const errText = (field: string) => fieldErrors[field]?.[0] ?? null;

  const applyName = (next: string) => {
    setName(next);
    const parsed = parseAcademicYearStart(next);
    if (parsed === null) {
      return;
    }
    const nextDates = academicYearDates(parsed);
    setStartsOn(nextDates.starts_on);
    setEndsOn(nextDates.ends_on);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await apiFetch<{ data: AcademicYear }>(
        "/v1/academic-years",
        {
          method: "POST",
          body: {
            name: name.trim(),
            starts_on: startsOn,
            ends_on: endsOn,
            status: "draft",
            is_current: false,
          },
        }
      );

      onCreated(response.data);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create session.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="dialog-overlay fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New session"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New session</h2>
            <p className="mt-0.5 text-sm text-muted">
              Create an academic year and return to the scheme.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--surface-secondary)] hover:text-foreground"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? <ErrorNotice message={error} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              htmlFor="session_name"
              required
              className="sm:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="session_name"
                value={name}
                placeholder="2032-2033"
                onChange={(event) => applyName(event.target.value)}
              />
            </Field>
            <Field
              label="Starts on"
              htmlFor="session_starts"
              required
              error={errText("starts_on")}
            >
              <TextInput
                id="session_starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Ends on"
              htmlFor="session_ends"
              required
              error={errText("ends_on")}
            >
              <TextInput
                id="session_ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
          <button
            type="button"
            className={buttonClasses("secondary")}
            onClick={onClose}
          >
            Cancel
          </button>
          <Button
            type="button"
            loading={busy}
            disabled={!name.trim() || !startsOn || !endsOn}
            onClick={() => void submit()}
          >
            Create session
          </Button>
        </div>
      </div>
    </div>
  );
}
