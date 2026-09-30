"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { EVENT_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { StudentEvent } from "@/lib/types";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <StudentAffairsTabs active="events" />
      <MasterList<StudentEvent>
        title="Events"
        description="School events with participants, budgets and outcomes."
        endpoint="/v1/student-affairs/events"
        searchable={false}
        createHref="/dashboard/student-affairs/events/new"
        createPermission="student_affairs.create"
        createLabel="New event"
        editHref={(event) => `/dashboard/student-affairs/events/${event.id}`}
        filters={[
          {
            param: "status",
            placeholder: "All statuses",
            options: EVENT_STATUS_OPTIONS,
          },
        ]}
        columns={[
          { header: "Event", render: (event) => event.title },
          { header: "Type", render: (event) => event.type ?? "-" },
          { header: "Starts", render: (event) => formatDate(event.starts_on) },
          { header: "Ends", render: (event) => formatDate(event.ends_on) },
          { header: "Venue", render: (event) => event.venue ?? "-" },
          {
            header: "Budget",
            align: "right",
            render: (event) =>
              event.budget ? formatCurrency(Number(event.budget)) : "-",
          },
          {
            header: "Participants",
            align: "right",
            render: (event) => event.participants_count ?? 0,
          },
          {
            header: "Status",
            render: (event) => <Badge value={event.status ?? "unknown"} />,
          },
        ]}
      />
    </div>
  );
}
