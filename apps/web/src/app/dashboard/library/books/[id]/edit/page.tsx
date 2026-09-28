"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Book } from "@/lib/types";

export default function EditBookPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Book>(
    id ? `/v1/library/books/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Book not found." />;

  return (
    <PermissionGate permission="library.edit">
      <MasterForm
        title="Edit book"
        description={data.title}
        endpoint="/v1/library/books"
        recordId={data.id}
        redirectTo="/dashboard/library/books"
        initial={{
          title: data.title,
          author: data.author ?? "",
          isbn: data.isbn ?? "",
          publisher: data.publisher ?? "",
          category: data.category ?? "",
          shelf: data.shelf ?? "",
          total_copies: String(data.total_copies),
          available_copies: String(data.available_copies),
          price: String(data.price),
          is_active: data.is_active,
        }}
        fields={[
          { name: "title", label: "Title", type: "text", required: true, span: 2 },
          { name: "author", label: "Author", type: "text" },
          { name: "isbn", label: "ISBN", type: "text" },
          { name: "publisher", label: "Publisher", type: "text" },
          { name: "category", label: "Category", type: "text" },
          { name: "shelf", label: "Shelf", type: "text" },
          {
            name: "total_copies",
            label: "Total copies",
            type: "number",
            required: true,
            min: "1",
          },
          {
            name: "available_copies",
            label: "Available copies",
            type: "number",
            min: "0",
            hint: "Adjusted automatically on issue and return.",
          },
          {
            name: "price",
            label: "Price",
            type: "number",
            min: "0",
            step: "0.01",
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
