"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useAcademicYears,
  useExamTypes,
  useTerms,
} from "@/lib/useLookups";
import { Button, buttonClasses, Field, Select, TextArea, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { Exam } from "@/lib/types";

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "published", label: "Published" },
];

export function ExamForm({ exam }: { exam?: Exam }) {
  const router = useRouter();
  const isEdit = Boolean(exam);

  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: terms, loading: termsLoading } = useTerms();
  const { items: types, loading: typesLoading } = useExamTypes();

  const currentYear = years.find((year) => year.is_current) ?? years[0];

  const [yearId, setYearId] = useState(
    exam ? String(exam.academic_year_id) : ""
  );
  const [termId, setTermId] = useState(
    exam?.term_id ? String(exam.term_id) : ""
  );
  const [typeId, setTypeId] = useState(
    exam ? String(exam.exam_type_id) : ""
  );
  const [name, setName] = useState(exam?.name ?? "");
  const [startsOn, setStartsOn] = useState(exam?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(exam?.ends_on ?? "");
  const [status, setStatus] = useState(exam?.status ?? "scheduled");
  const [description, setDescription] = useState(exam?.description ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const effectiveYear = yearId || (currentYear ? String(currentYear.id) : "");

  const filteredTerms = terms.filter(
    (term) => !effectiveYear || String(term.academic_year_id) === effectiveYear
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      academic_year_id: Number(effectiveYear),
      exam_type_id: Number(typeId),
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      status,
      ...(termId ? { term_id: Number(termId) } : {}),
      ...(description ? { description } : {}),
    };

    try {
      if (isEdit && exam) {
        await apiFetch(`/v1/exams/${exam.id}`, { method: "PUT", body });
        router.push(`/dashboard/exams/records/${exam.id}`);
        return;
      }

      const created = await apiFetch<{ data: { id: number } }>("/v1/exams", {
        method: "POST",
        body,
      });
      router.push(`/dashboard/exams/records/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save the exam.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (yearsLoading || termsLoading || typesLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${exam?.name}` : "New examination"}
        description="Schedule an assessment window for a class."
        actions={
          <Link
            href={isEdit && exam ? `/dashboard/exams/records/${exam.id}` : "/dashboard/exams/records"}
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
              htmlFor="exam_year"
              required
              error={errText("academic_year_id")}
            >
              <Select
                id="exam_year"
                value={effectiveYear}
                onChange={(event) => {
                  setYearId(event.target.value);
                  setTermId("");
                }}
              >
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Term" htmlFor="exam_term" error={errText("term_id")}>
              <Select
                id="exam_term"
                value={termId}
                onChange={(event) => setTermId(event.target.value)}
              >
                <option value="">Not specified</option>
                {filteredTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Exam type"
              htmlFor="exam_type"
              required
              error={errText("exam_type_id")}
            >
              <Select
                id="exam_type"
                value={typeId}
                onChange={(event) => setTypeId(event.target.value)}
              >
                <option value="">Select type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Status"
              htmlFor="exam_status"
              error={errText("status")}
            >
              <Select
                id="exam_status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Name"
              htmlFor="exam_name"
              required
              className="sm:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="exam_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Mid-Term Examinations"
              />
            </Field>
            <Field
              label="Starts on"
              htmlFor="exam_starts"
              required
              error={errText("starts_on")}
            >
              <TextInput
                id="exam_starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Ends on"
              htmlFor="exam_ends"
              required
              error={errText("ends_on")}
            >
              <TextInput
                id="exam_ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="exam_description"
              className="sm:col-span-2"
              error={errText("description")}
            >
              <TextArea
                id="exam_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href={isEdit && exam ? `/dashboard/exams/records/${exam.id}` : "/dashboard/exams/records"}
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              loading={busy}
              disabled={!effectiveYear || !typeId || !name || !startsOn || !endsOn}
            >
              {isEdit ? "Save changes" : "Create exam"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
