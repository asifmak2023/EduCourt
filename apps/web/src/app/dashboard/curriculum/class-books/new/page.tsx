"use client";

import { useAcademicYears, useClassRooms, useSubjects } from "@/lib/useLookups";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { Spinner } from "@/components/ui";

export default function NewClassBookPage() {
  const { items: years, loading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="curriculum.create">
      <MasterForm
        title="New class book"
        description="Add a book to a class reading list."
        endpoint="/v1/class-books"
        redirectTo="/dashboard/curriculum/class-books"
        initial={{ is_required: false }}
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
          {
            name: "title",
            label: "Title",
            type: "text",
            required: true,
            span: 2,
          },
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
