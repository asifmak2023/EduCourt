"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useClassRooms, useSections } from "@/lib/useLookups";
import { CIRCULAR_AUDIENCE_OPTIONS } from "@/lib/circularOptions";

export default function NewCircularPage() {
  return (
    <PermissionGate permission="circular.create">
      <NewCircularForm />
    </PermissionGate>
  );
}

function NewCircularForm() {
  const { items: classRooms } = useClassRooms();
  const { items: sections } = useSections();

  return (
    <MasterForm
      title="New circular"
      description="Draft a circular. Publish it from the detail page."
      endpoint="/v1/circulars"
      redirectTo="/dashboard/circulars"
      submitLabel="Save draft"
      fields={[
        { name: "title", label: "Title", required: true, span: 2 },
        {
          name: "audience",
          label: "Audience",
          type: "select",
          options: CIRCULAR_AUDIENCE_OPTIONS,
        },
        {
          name: "class_room_id",
          label: "Class",
          type: "select",
          placeholder: "All classes",
          options: classRooms.map((classRoom) => ({
            value: String(classRoom.id),
            label: classRoom.name,
          })),
        },
        {
          name: "section_id",
          label: "Section",
          type: "select",
          placeholder: "All sections",
          options: sections.map((section) => ({
            value: String(section.id),
            label: section.name,
          })),
        },
        { name: "expires_on", label: "Expires on", type: "date" },
        { name: "attachment_path", label: "Attachment path" },
        { name: "body", label: "Body", type: "textarea", required: true, span: 2 },
      ]}
      initial={{
        title: "",
        audience: "all",
        class_room_id: "",
        section_id: "",
        expires_on: "",
        attachment_path: "",
        body: "",
      }}
    />
  );
}
