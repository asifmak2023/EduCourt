"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import type { AcademicYear } from "@/lib/types";

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
];

export function AcademicYearForm({ year }: { year?: AcademicYear }) {
  const router = useRouter();
  const isEdit = Boolean(year);

  const [name, setName] = useState(year?.name ?? "");
  const [code, setCode] = useState(year?.code ?? "");
  const [startsOn, setStartsOn] = useState(year?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(year?.ends_on ?? "");
  const [status, setStatus] = useState(year?.status ?? "draft");
  const [isCurrent, setIsCurrent] = useState(year?.is_current ?? false);
  const [notes, setNotes] = useState(year?.notes ?? "");

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
      code,
      starts_on: startsOn,
      ends_on: endsOn,
      status,
      is_current: isCurrent,
    };
    if (notes) body.notes = notes;

    try {
      if (isEdit && year) {
        await apiFetch(`/v1/academic-years/${year.id}`, { method: "PUT", body });
        router.push(`/dashboard/academics/academic-years/${year.id}`);
        return;
      }

      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/academic-years",
        { method: "POST", body }
      );
      router.push(
        `/dashboard/academics/academic-years/${created.data.id}`
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save academic year.");
      }
    } finally {
      setBusy(false);
    }
  };

  const cancelHref = year
    ? `/dashboard/academics/academic-years/${year.id}`
    : "/dashboard/academics/academic-years";

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${year?.name}` : "New academic year"}
        description="A session with an overall date range and terms."
        actions={
          <Link href={cancelHref} className={buttonClasses("secondary")}>
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
              label="Name"
              htmlFor="year_name"
              required
              error={errText("name")}
            >
              <TextInput
                id="year_name"
                value={name}
                placeholder="2026-2027"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Code"
              htmlFor="year_code"
              required
              error={errText("code")}
            >
              <TextInput
                id="year_code"
                value={code}
                placeholder="FY-2026-27"
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Field
              label="Starts on"
              htmlFor="year_starts"
              required
              error={errText("starts_on")}
            >
              <TextInput
                id="year_starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
            </Field>
            <Field
              label="Ends on"
              htmlFor="year_ends"
              required
              error={errText("ends_on")}
            >
              <TextInput
                id="year_ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="year_status" error={errText("status")}>
              <Select
                id="year_status"
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
            <div className="flex items-end">
              <Checkbox
                label="Current academic year"
                checked={isCurrent}
                onChange={(event) => setIsCurrent(event.target.checked)}
              />
            </div>
            <Field
              label="Notes"
              htmlFor="year_notes"
              className="sm:col-span-2"
              error={errText("notes")}
            >
              <TextArea
                id="year_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link href={cancelHref} className={buttonClasses("secondary")}>
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create year"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
