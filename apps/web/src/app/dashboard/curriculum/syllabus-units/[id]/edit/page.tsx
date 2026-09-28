"use client";

import { useParams } from "next/navigation";
import {
  useAcademicYears,
  useClassRooms,
  useSubjects,
  useTerms,
} from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { SyllabusUnit } from "@/lib/types";

export default function EditSyllabusUnitPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<SyllabusUnit>(
    id ? `/v1/syllabus-units/${id}` : null
  );
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();
  const { items: terms } = useTerms();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Syllabus unit not found." />;

  return (
    <PermissionGate permission="curriculum.edit">
      <MasterForm
        title="Edit syllabus unit"
        description={data.title}
        endpoint="/v1/syllabus-units"
        recordId={data.id}
        redirectTo="/dashboard/curriculum/syllabus-units"
        initial={{
          academic_year_id: String(data.academic_year_id),
          class_room_id: String(data.class_room_id),
          subject_id: String(data.subject_id),
          term_id: data.term_id === null ? "" : String(data.term_id),
          title: data.title,
          description: data.description ?? "",
          sequence: String(data.sequence),
          estimated_periods:
            data.estimated_periods === null
              ? ""
              : String(data.estimated_periods),
        }}
        fields={[
          {
            name: "academic_year_id",
            label: "Academic year",
            type: "select",
            required: true,
            options: years.map((year) => ({
              value: String(year.id),
              label: year.name,
            })),
          },
          {
            name: "class_room_id",
            label: "Class",
            type: "select",
            required: true,
            options: classes.map((room) => ({
              value: String(room.id),
              label: room.name,
            })),
          },
          {
            name: "subject_id",
            label: "Subject",
            type: "select",
            required: true,
            options: subjects.map((subject) => ({
              value: String(subject.id),
              label: subject.name,
            })),
          },
          {
            name: "term_id",
            label: "Term",
            type: "select",
            placeholder: "Optional",
            options: terms.map((term) => ({
              value: String(term.id),
              label: term.name,
            })),
          },
          { name: "title", label: "Title", type: "text", required: true, span: 2 },
          {
            name: "description",
            label: "Description",
            type: "text",
            span: 2,
          },
          { name: "sequence", label: "Sequence", type: "number", min: "1" },
          {
            name: "estimated_periods",
            label: "Estimated periods",
            type: "number",
            min: "0",
          },
        ]}
      />
    </PermissionGate>
  );
}
