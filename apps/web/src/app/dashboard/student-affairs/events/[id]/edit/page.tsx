"use client";

import { useParams } from "next/navigation";
import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import { EVENT_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";
import type { StudentEvent } from "@/lib/types";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<StudentEvent>(
    id ? `/v1/student-affairs/events/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Event not found." />;

  return (
    <PermissionGate permission="student_affairs.edit">
      <div className="space-y-6">
        <StudentAffairsTabs active="events" />
        <MasterForm
          title="Edit event"
          description={data.title}
          endpoint="/v1/student-affairs/events"
          recordId={data.id}
          redirectTo="/dashboard/student-affairs/events"
          initial={{
            title: data.title,
            type: data.type ?? "",
            status: data.status ?? "planned",
            starts_on: data.starts_on ?? "",
            ends_on: data.ends_on ?? "",
            venue: data.venue ?? "",
            budget: data.budget === null ? "" : String(data.budget),
            description: data.description ?? "",
          }}
          fields={[
            { name: "title", label: "Title", required: true, span: 2 },
            { name: "type", label: "Type" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: EVENT_STATUS_OPTIONS,
            },
            { name: "starts_on", label: "Starts on", type: "date", required: true },
            { name: "ends_on", label: "Ends on", type: "date" },
            { name: "venue", label: "Venue" },
            { name: "budget", label: "Budget", type: "number", min: "0", step: "0.01" },
            { name: "description", label: "Description", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
