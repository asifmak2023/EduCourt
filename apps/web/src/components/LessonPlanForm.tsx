"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
  useSyllabusUnits,
  useTerms,
} from "@/lib/useLookups";
import { Button, buttonClasses, Field, Select, TextArea, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { LessonPlan } from "@/lib/types";

export interface LessonPlanFormValues {
  academic_year_id: string;
  class_room_id: string;
  subject_id: string;
  term_id: string;
  syllabus_unit_id: string;
  title: string;
  planned_from: string;
  planned_to: string;
  status: string;
  objectives: string;
  content: string;
  resources: string;
  activities: string;
  assessment: string;
}

export function LessonPlanForm({
  recordId,
  initial,
}: {
  recordId?: number;
  initial: LessonPlanFormValues;
}) {
  const router = useRouter();
  const isEdit = recordId !== undefined;
  const { items: years, loading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();
  const { items: terms } = useTerms();
  const { items: syllabusUnits } = useSyllabusUnits();

  const [values, setValues] = useState<LessonPlanFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (name: keyof LessonPlanFormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const relevantUnits = syllabusUnits.filter(
    (unit) =>
      (!values.class_room_id ||
        String(unit.class_room_id) === values.class_room_id) &&
      (!values.subject_id || String(unit.subject_id) === values.subject_id)
  );

  const submit = async () => {
    setBusy(true);
    setError(null);

    const body: Record<string, unknown> = {
      academic_year_id: Number(values.academic_year_id),
      class_room_id: Number(values.class_room_id),
      subject_id: Number(values.subject_id),
      title: values.title,
      status: values.status || "draft",
    };

    if (values.term_id) body.term_id = Number(values.term_id);
    if (values.syllabus_unit_id)
      body.syllabus_unit_id = Number(values.syllabus_unit_id);
    if (values.planned_from) body.planned_from = values.planned_from;
    if (values.planned_to) body.planned_to = values.planned_to;
    if (values.objectives) body.objectives = values.objectives;
    if (values.content) body.content = values.content;
    if (values.resources) body.resources = values.resources;
    if (values.activities) body.activities = values.activities;
    if (values.assessment) body.assessment = values.assessment;

    try {
      if (isEdit) {
        await apiFetch(`/v1/lesson-plans/${recordId}`, { method: "PUT", body });
        router.push(`/dashboard/curriculum/lesson-plans/${recordId}`);
      } else {
        const created = await apiFetch<{ data: { id: number } }>(
          "/v1/lesson-plans",
          { method: "POST", body }
        );
        router.push(`/dashboard/curriculum/lesson-plans/${created.data.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit lesson plan" : "New lesson plan"}
        description="Plan a lesson and route it for approval."
        actions={
          <Link
            href="/dashboard/curriculum/lesson-plans"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Academic year" htmlFor="lp_year" required>
            <Select
              id="lp_year"
              value={values.academic_year_id}
              onChange={(event) => setValue("academic_year_id", event.target.value)}
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="lp_class" required>
            <Select
              id="lp_class"
              value={values.class_room_id}
              onChange={(event) => {
                setValue("class_room_id", event.target.value);
                setValue("syllabus_unit_id", "");
              }}
            >
              <option value="">Select class</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="lp_subject" required>
            <Select
              id="lp_subject"
              value={values.subject_id}
              onChange={(event) => {
                setValue("subject_id", event.target.value);
                setValue("syllabus_unit_id", "");
              }}
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Term" htmlFor="lp_term">
            <Select
              id="lp_term"
              value={values.term_id}
              onChange={(event) => setValue("term_id", event.target.value)}
            >
              <option value="">Optional</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Syllabus unit" htmlFor="lp_unit">
            <Select
              id="lp_unit"
              value={values.syllabus_unit_id}
              onChange={(event) =>
                setValue("syllabus_unit_id", event.target.value)
              }
            >
              <option value="">Optional</option>
              {relevantUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.sequence}. {unit.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="lp_status" required>
            <Select
              id="lp_status"
              value={values.status}
              onChange={(event) => setValue("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor="lp_title" required className="sm:col-span-3">
            <TextInput
              id="lp_title"
              value={values.title}
              onChange={(event) => setValue("title", event.target.value)}
            />
          </Field>
          <Field label="Planned from" htmlFor="lp_from">
            <TextInput
              id="lp_from"
              type="date"
              value={values.planned_from}
              onChange={(event) => setValue("planned_from", event.target.value)}
            />
          </Field>
          <Field label="Planned to" htmlFor="lp_to">
            <TextInput
              id="lp_to"
              type="date"
              value={values.planned_to}
              onChange={(event) => setValue("planned_to", event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Objectives" htmlFor="lp_objectives">
            <TextArea
              id="lp_objectives"
              rows={3}
              value={values.objectives}
              onChange={(event) => setValue("objectives", event.target.value)}
            />
          </Field>
          <Field label="Content" htmlFor="lp_content">
            <TextArea
              id="lp_content"
              rows={3}
              value={values.content}
              onChange={(event) => setValue("content", event.target.value)}
            />
          </Field>
          <Field label="Resources" htmlFor="lp_resources">
            <TextArea
              id="lp_resources"
              rows={2}
              value={values.resources}
              onChange={(event) => setValue("resources", event.target.value)}
            />
          </Field>
          <Field label="Activities" htmlFor="lp_activities">
            <TextArea
              id="lp_activities"
              rows={2}
              value={values.activities}
              onChange={(event) => setValue("activities", event.target.value)}
            />
          </Field>
          <Field label="Assessment" htmlFor="lp_assessment">
            <TextArea
              id="lp_assessment"
              rows={2}
              value={values.assessment}
              onChange={(event) => setValue("assessment", event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href={
              isEdit
                ? `/dashboard/curriculum/lesson-plans/${recordId}`
                : "/dashboard/curriculum/lesson-plans"
            }
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
          <Button
            type="button"
            loading={busy}
            disabled={
              !values.academic_year_id ||
              !values.class_room_id ||
              !values.subject_id ||
              !values.title
            }
            onClick={submit}
          >
            {isEdit ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function lessonPlanInitial(plan: LessonPlan): LessonPlanFormValues {
  return {
    academic_year_id: String(plan.academic_year_id),
    class_room_id: String(plan.class_room_id),
    subject_id: String(plan.subject_id),
    term_id: plan.term_id === null ? "" : String(plan.term_id),
    syllabus_unit_id:
      plan.syllabus_unit_id === null ? "" : String(plan.syllabus_unit_id),
    title: plan.title,
    planned_from: plan.planned_from ?? "",
    planned_to: plan.planned_to ?? "",
    status: plan.status ?? "draft",
    objectives: plan.objectives ?? "",
    content: plan.content ?? "",
    resources: plan.resources ?? "",
    activities: plan.activities ?? "",
    assessment: plan.assessment ?? "",
  };
}

export const EMPTY_LESSON_PLAN: LessonPlanFormValues = {
  academic_year_id: "",
  class_room_id: "",
  subject_id: "",
  term_id: "",
  syllabus_unit_id: "",
  title: "",
  planned_from: "",
  planned_to: "",
  status: "draft",
  objectives: "",
  content: "",
  resources: "",
  activities: "",
  assessment: "",
};
