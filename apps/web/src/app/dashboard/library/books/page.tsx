"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Book } from "@/lib/types";

export default function BooksPage() {
  const { can } = useAuth();

  return (
    <MasterList<Book>
      title="Library books"
      description="Titles held by the campus library."
      endpoint="/v1/library/books"
      searchPlaceholder="Search title, author or ISBN"
      createHref={can("library.create") ? "/dashboard/library/books/new" : undefined}
      createLabel="New book"
      editHref={(item) => `/dashboard/library/books/${item.id}/edit`}
      filters={[
        {
          param: "available",
          placeholder: "Availability",
          options: [{ value: "1", label: "Available only" }],
        },
      ]}
      columns={[
        { header: "Title", render: (item) => item.title },
        { header: "Author", render: (item) => item.author ?? "-" },
        { header: "Category", render: (item) => item.category ?? "-" },
        { header: "Shelf", render: (item) => item.shelf ?? "-" },
        {
          header: "Copies",
          align: "right",
          render: (item) =>
            `${formatNumber(item.available_copies)} / ${formatNumber(item.total_copies)}`,
        },
        {
          header: "Price",
          align: "right",
          render: (item) => formatCurrency(item.price),
        },
        {
          header: "Active",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
