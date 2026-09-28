"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicYears } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { Term } from "@/lib/types";

export function TermForm({
  term,
  defaultAcademicYearId = "",
}: {
  term?: Term;
  defaultAcademicYearId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(term);
  const { items: years, loading: yearsLoading } = useAcademicYears();

  const [academicYearId, setAcademicYearId] = useState(
    term?.academic_year_id
      ? String(term.academic_year_id)
      : defaultAcademicYearId
  );
  const [name, setName] = useState(term?.name ?? "");
  const [sequence, setSequence] = useState(
    term?.sequence ? String(term.sequence) : "1"
  );
  const [startsOn, setStartsOn] = useState(term?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(term?.ends_on ?? "");
  const [isCurrent, setIsCurrent] = useState(term?.is_current ?? false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      name,
      sequence: Number(sequence) || 1,
      starts_on: startsOn,
      ends_on: endsOn,
      is_current: isCurrent,
    };

    try {
      if (isEdit && term) {
        await apiFetch(`/v1/terms/${term.id}`, { method: "PUT", body });
        router.push("/dashboard/academics/terms");
        return;
      }

      body.academic_year_id = Number(academicYearId);

      await apiFetch("/v1/terms", { method: "POST", body });
      router.push("/dashboard/academics/terms");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save term.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (yearsLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${term?.name}` : "New term"}
        description="Terms must fall inside their academic year."
        actions={
          <Link
            href="/dashboard/academics/terms"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <Field
              label="Academic year"
              htmlFor="term_year"
              required
              error={errText("academic_year_id")}
              className="sm:col-span-2"
            >
              {isEdit ? (
                <TextInput
                  id="term_year"
                  value={term?.academic_year?.name ?? `Year #${academicYearId}`}
                  readOnly
                  disabled
                />
              ) : (
                <Select
                  id="term_year"
                  value={academicYearId}
                  onChange={(event) => setAcademicYearId(event.target.value)}
                >
                  <option value="">Select academic year</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field
              label="Name"
              htmlFor="term_name"
              required
              error={errText("name")}
            >
              <TextInput
                id="term_name"
                value={name}
                placeholder="Term 1"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Sequence"
              htmlFor="term_sequence"
              error={errText("sequence")}
            >
              <TextInput
                id="term_sequence"
                type="number"
                min="1"
                value={sequence}
                onChange={(event) => setSequence(event.target.value)}
              />
            </Field>
            <Field
              label="Starts on"
              htmlFor="term_starts"
              required
              error={errText("starts_on")}
            >
              <TextInput
                id="term_starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Ends on"
              htmlFor="term_ends"
              required
              error={errText("ends_on")}
            >
              <TextInput
                id="term_ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Checkbox
                label="Current term"
                checked={isCurrent}
                onChange={(event) => setIsCurrent(event.target.checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/academics/terms"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create term"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
