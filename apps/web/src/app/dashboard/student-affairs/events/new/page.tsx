"use client";

import { StudentAffairsTabs } from "@/components/StudentAffairsTabs";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { EVENT_STATUS_OPTIONS } from "@/lib/studentAffairsOptions";

export default function NewEventPage() {
  return (
    <PermissionGate permission="student_affairs.create">
      <div className="space-y-6">
        <StudentAffairsTabs active="events" />
        <MasterForm
          title="New event"
          description="Plan a school event."
          endpoint="/v1/student-affairs/events"
          redirectTo="/dashboard/student-affairs/events"
          submitLabel="Create event"
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
          initial={{
            title: "",
            type: "",
            status: "planned",
            starts_on: "",
            ends_on: "",
            venue: "",
            budget: "",
            description: "",
          }}
        />
      </div>
    </PermissionGate>
  );
}
