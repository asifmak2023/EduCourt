"use client";

/**
 * EnrollmentPanel
 * ---------------
 * Inline add / edit / delete of student enrollments.
 * Used on both the student detail page and the student edit page.
 */

import { useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAcademicOptions } from "@/lib/useLookups";
import { Button, Field, Select, TextInput } from "@/components/Form";
import { Badge, ErrorNotice, SectionCard, Spinner, SuccessNotice } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Enrollment } from "@/lib/types";

interface EnrollmentForm {
  academic_year_id: string;
  class_room_id: string;
  section_id: string;
  roll_number: string;
  status: string;
  starts_on: string;
  ends_on: string;
}

function emptyForm(): EnrollmentForm {
  return {
    academic_year_id: "",
    class_room_id: "",
    section_id: "",
    roll_number: "",
    status: "active",
    starts_on: "",
    ends_on: "",
  };
}

function formFromEnrollment(e: Enrollment): EnrollmentForm {
  return {
    academic_year_id: String(e.academic_year_id),
    class_room_id: String(e.class_room_id),
    section_id: e.section_id ? String(e.section_id) : "",
    roll_number: e.roll_number ?? "",
    status: e.status ?? "active",
    starts_on: e.starts_on ?? "",
    ends_on: e.ends_on ?? "",
  };
}

export function EnrollmentPanel({
  studentId,
  enrollments,
  onChanged,
  canEdit = true,
}: {
  studentId: number;
  enrollments: Enrollment[];
  onChanged: () => void;
  canEdit?: boolean;
}) {
  const { options, loading: optLoading } = useAcademicOptions();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<EnrollmentForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const filteredSections = useMemo(
    () =>
      options.sections.filter(
        (s) => !form.class_room_id || String(s.class_room_id) === form.class_room_id
      ),
    [options.sections, form.class_room_id]
  );

  const setField = (key: keyof EnrollmentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openNew = () => {
    setForm(emptyForm());
    setError(null);
    setSuccess(null);
    setEditing("new");
  };

  const openEdit = (enrollment: Enrollment) => {
    setForm(formFromEnrollment(enrollment));
    setError(null);
    setSuccess(null);
    setEditing(enrollment.id);
  };

  const cancel = () => {
    setEditing(null);
    setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, unknown> = {
        student_id: studentId,
        academic_year_id: Number(form.academic_year_id),
        class_room_id: Number(form.class_room_id),
        section_id: form.section_id ? Number(form.section_id) : null,
        roll_number: form.roll_number || null,
        status: form.status || "active",
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
      };

      if (editing === "new") {
        await apiFetch("/v1/student-enrollments", { method: "POST", body });
        setSuccess("Enrollment added.");
      } else {
        await apiFetch(`/v1/student-enrollments/${editing}`, { method: "PUT", body });
        setSuccess("Enrollment updated.");
      }

      setEditing(null);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to save enrollment.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/v1/student-enrollments/${id}`, { method: "DELETE" });
      setSuccess("Enrollment removed.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to remove enrollment.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <SectionCard
      title="students.enrollments"
      description="students.enrollmentsDesc"
      actions={
        canEdit && editing === null ? (
          <Button type="button" variant="secondary" onClick={openNew}>
            Add enrollment
          </Button>
        ) : undefined
      }
    >
      {error ? <ErrorNotice message={error} /> : null}
      {success ? (
        <div className="mb-3">
          <SuccessNotice message={success} />
        </div>
      ) : null}

      {/* Existing enrollments list */}
      {enrollments.length === 0 && editing !== "new" ? (
        <p className="text-sm text-muted">No enrollments recorded.</p>
      ) : (
        <div className="divide-y divide-border">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id}>
              {editing === enrollment.id ? (
                <EnrollmentForm
                  form={form}
                  setField={setField}
                  options={options}
                  filteredSections={filteredSections}
                  optLoading={optLoading}
                  busy={busy}
                  onSave={() => void save()}
                  onCancel={cancel}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="space-y-0.5 text-sm">
                    <p className="font-medium text-foreground">
                      {enrollment.academic_year?.name ?? `Year #${enrollment.academic_year_id}`}
                      {" · "}
                      {enrollment.class_room?.name ?? `Class #${enrollment.class_room_id}`}
                      {enrollment.section?.name ? ` — ${enrollment.section.name}` : ""}
                      {enrollment.roll_number ? ` · Roll ${enrollment.roll_number}` : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {[
                        enrollment.starts_on ? `From ${formatDate(enrollment.starts_on)}` : null,
                        enrollment.ends_on ? `to ${formatDate(enrollment.ends_on)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge value={enrollment.status} />
                    {canEdit ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openEdit(enrollment)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          loading={deleting === enrollment.id}
                          onClick={() => void remove(enrollment.id)}
                        >
                          Remove
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add-new form */}
      {editing === "new" ? (
        <div className={enrollments.length > 0 ? "border-t border-border pt-4" : ""}>
          <p className="mb-3 text-sm font-semibold text-foreground">New enrollment</p>
          <EnrollmentForm
            form={form}
            setField={setField}
            options={options}
            filteredSections={filteredSections}
            optLoading={optLoading}
            busy={busy}
            onSave={() => void save()}
            onCancel={cancel}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

function EnrollmentForm({
  form,
  setField,
  options,
  filteredSections,
  optLoading,
  busy,
  onSave,
  onCancel,
}: {
  form: EnrollmentForm;
  setField: (key: keyof EnrollmentForm, value: string) => void;
  options: { academic_years: { id: number; name: string }[]; class_rooms: { id: number; name: string }[]; sections: { id: number; name: string; class_room_id: number }[] };
  filteredSections: { id: number; name: string; class_room_id: number }[];
  optLoading: boolean;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (optLoading) {
    return <Spinner />;
  }

  return (
    <div className="py-2">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="common.academicYear" htmlFor="enr_year" required>
          <Select
            id="enr_year"
            value={form.academic_year_id}
            onChange={(e) => setField("academic_year_id", e.target.value)}
          >
            <option value="">Select year</option>
            {options.academic_years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="common.class" htmlFor="enr_class" required>
          <Select
            id="enr_class"
            value={form.class_room_id}
            onChange={(e) => {
              setField("class_room_id", e.target.value);
              setField("section_id", "");
            }}
          >
            <option value="">Select class</option>
            {options.class_rooms.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="common.section" htmlFor="enr_section">
          <Select
            id="enr_section"
            value={form.section_id}
            disabled={!form.class_room_id}
            onChange={(e) => setField("section_id", e.target.value)}
          >
            <option value="">No section</option>
            {filteredSections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="common.rollNumber" htmlFor="enr_roll">
          <TextInput
            id="enr_roll"
            value={form.roll_number}
            onChange={(e) => setField("roll_number", e.target.value)}
          />
        </Field>

        <Field label="common.status" htmlFor="enr_status">
          <Select
            id="enr_status"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            <option value="active">Active</option>
            <option value="promoted">Promoted</option>
            <option value="repeated">Repeated</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred</option>
          </Select>
        </Field>

        <Field label="common.starts" htmlFor="enr_starts">
          <TextInput
            id="enr_starts"
            type="date"
            value={form.starts_on}
            onChange={(e) => setField("starts_on", e.target.value)}
          />
        </Field>

        <Field label="common.ends" htmlFor="enr_ends">
          <TextInput
            id="enr_ends"
            type="date"
            value={form.ends_on}
            onChange={(e) => setField("ends_on", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="button" loading={busy} onClick={onSave}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
