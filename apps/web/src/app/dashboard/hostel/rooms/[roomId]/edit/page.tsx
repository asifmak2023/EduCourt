"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import { HOSTEL_ROOM_TYPE_OPTIONS } from "@/lib/hostelOptions";
import type { HostelRoom } from "@/lib/types";

export default function EditHostelRoomPage() {
  const params = useParams<{ roomId: string }>();
  const id = params?.roomId ? Number(params.roomId) : undefined;

  const { data, loading, error } = useResource<HostelRoom>(
    id ? `/v1/hostel-rooms/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Room not found." />;

  return (
    <PermissionGate permission="hostel.edit">
      <MasterForm
        title="Edit room"
        description={data.room_no}
        endpoint="/v1/hostel-rooms"
        recordId={data.id}
        redirectTo={`/dashboard/hostel/${data.hostel_id}`}
        initial={{
          room_no: data.room_no,
          floor: data.floor ?? "",
          type: data.type ?? "double",
          capacity: String(data.capacity),
          monthly_fee: String(data.monthly_fee),
          is_active: data.is_active,
        }}
        fields={[
          { name: "room_no", label: "Room no.", type: "text", required: true },
          { name: "floor", label: "Floor", type: "text" },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: HOSTEL_ROOM_TYPE_OPTIONS,
          },
          {
            name: "capacity",
            label: "Capacity",
            type: "number",
            min: "1",
            hint: "Cannot be lower than current occupancy.",
          },
          {
            name: "monthly_fee",
            label: "Monthly fee",
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
