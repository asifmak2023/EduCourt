"use client";

import { useAuth } from "@/lib/auth";
import { useClassRooms, useSubjects } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { ClassBook } from "@/lib/types";

export default function ClassBooksPage() {
  const { can } = useAuth();
  const { items: classes } = useClassRooms();
  const { items: subjects } = useSubjects();

  return (
    <MasterList<ClassBook>
      title="Class books"
      description="Prescribed and reference books per class."
      endpoint="/v1/class-books"
      createHref={
        can("curriculum.create")
          ? "/dashboard/curriculum/class-books/new"
          : undefined
      }
      createLabel="New book"
      editHref={(book) => `/dashboard/curriculum/class-books/${book.id}/edit`}
      filters={[
        {
          param: "class_room_id",
          placeholder: "All classes",
          options: classes.map((room) => ({
            value: String(room.id),
            label: room.name,
          })),
        },
        {
          param: "subject_id",
          placeholder: "All subjects",
          options: subjects.map((subject) => ({
            value: String(subject.id),
            label: subject.name,
          })),
        },
      ]}
      columns={[
        { header: "Title", render: (book) => book.title },
        { header: "Class", render: (book) => book.class_room?.name ?? "-" },
        { header: "Subject", render: (book) => book.subject?.name ?? "-" },
        { header: "Author", render: (book) => book.author ?? "-" },
        {
          header: "Required",
          render: (book) => (
            <Badge value={book.is_required ? "required" : "optional"} />
          ),
        },
        {
          header: "Price",
          align: "right",
          render: (book) => formatCurrency(book.price),
        },
      ]}
    />
  );
}
