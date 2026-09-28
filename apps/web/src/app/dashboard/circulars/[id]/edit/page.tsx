"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useClassRooms, useSections } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import { CIRCULAR_AUDIENCE_OPTIONS } from "@/lib/circularOptions";
import type { Circular } from "@/lib/types";

export default function EditCircularPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<Circular>(
    id ? `/v1/circulars/${id}` : null
  );
  const { items: classRooms } = useClassRooms();
  const { items: sections } = useSections();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Circular not found." />;

  const stringValue = (value: number | null) =>
    value === null ? "" : String(value);

  return (
    <PermissionGate permission="circular.edit">
      <MasterForm
        title="Edit circular"
        description={data.title}
        endpoint="/v1/circulars"
        recordId={data.id}
        redirectTo={`/dashboard/circulars/${data.id}`}
        initial={{
          title: data.title,
          audience: data.audience ?? "all",
          class_room_id: stringValue(data.class_room_id),
          section_id: stringValue(data.section_id),
          expires_on: data.expires_on ?? "",
          attachment_path: data.attachment_path ?? "",
          body: data.body,
        }}
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
      />
    </PermissionGate>
  );
}
