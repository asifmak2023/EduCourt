"use client";

import { useParams } from "next/navigation";
import { useAcademicYears, useClassRooms, useSubjects } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ClassBook } from "@/lib/types";

export default function EditClassBookPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<ClassBook>(
    id ? `/v1/class-books/${id}` : null
  );
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Book not found." />;

  return (
    <PermissionGate permission="curriculum.edit">
      <MasterForm
        title="Edit class book"
        description={data.title}
        endpoint="/v1/class-books"
        recordId={data.id}
        redirectTo="/dashboard/curriculum/class-books"
        initial={{
          academic_year_id: String(data.academic_year_id),
          class_room_id: String(data.class_room_id),
          subject_id: data.subject_id === null ? "" : String(data.subject_id),
          title: data.title,
          author: data.author ?? "",
          publisher: data.publisher ?? "",
          isbn: data.isbn ?? "",
          edition: data.edition ?? "",
          price: data.price ?? "",
          is_required: data.is_required,
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
            placeholder: "Optional",
            options: subjects.map((subject) => ({
              value: String(subject.id),
              label: subject.name,
            })),
          },
          { name: "title", label: "Title", type: "text", required: true, span: 2 },
          { name: "author", label: "Author", type: "text" },
          { name: "publisher", label: "Publisher", type: "text" },
          { name: "isbn", label: "ISBN", type: "text" },
          { name: "edition", label: "Edition", type: "text" },
          { name: "price", label: "Price", type: "number", min: "0", step: "0.01" },
          {
            name: "is_required",
            label: "Required book",
            type: "checkbox",
          },
        ]}
      />
    </PermissionGate>
  );
}
