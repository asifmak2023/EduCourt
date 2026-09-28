"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";

export default function NewBookPage() {
  return (
    <PermissionGate permission="library.create">
      <MasterForm
        title="New book"
        description="Add a title to the library catalogue."
        endpoint="/v1/library/books"
        redirectTo="/dashboard/library/books"
        initial={{ total_copies: "1", price: "0", is_active: true }}
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
            hint: "Defaults to total copies.",
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
