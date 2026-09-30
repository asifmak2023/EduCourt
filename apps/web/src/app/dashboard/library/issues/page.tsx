"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BookIssue } from "@/lib/types";

function memberLabel(issue: BookIssue) {
  if (issue.student) return issue.student.full_name;
  if (issue.user_id) return `Staff #${issue.user_id}`;
  return "-";
}

export default function BookIssuesPage() {
  const { can } = useAuth();

  return (
    <MasterList<BookIssue>
      title="Issue and return"
      description="Books currently on loan and their return history."
      endpoint="/v1/library/issues"
      searchable={false}
      createHref={can("library.create") ? "/dashboard/library/issues/new" : undefined}
      createLabel="Issue a book"
      editHref={(item) => `/dashboard/library/issues/${item.id}`}
      filters={[
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "issued", label: "Issued" },
            { value: "overdue", label: "Overdue" },
            { value: "returned", label: "Returned" },
            { value: "lost", label: "Lost" },
          ],
        },
      ]}
      columns={[
        { header: "Book", render: (item) => item.book?.title ?? `#${item.book_id}` },
        { header: "Member", render: (item) => memberLabel(item) },
        { header: "Issued", render: (item) => formatDate(item.issued_on) },
        { header: "Due", render: (item) => formatDate(item.due_on) },
        { header: "Returned", render: (item) => formatDate(item.returned_on) },
        {
          header: "Fine",
          align: "right",
          render: (item) => formatCurrency(item.fine_amount),
        },
        {
          header: "Status",
          render: (item) => <Badge value={item.status ?? "unknown"} />,
        },
      ]}
    />
  );
}
