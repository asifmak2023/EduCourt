"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import { HOSTEL_ROOM_TYPE_OPTIONS } from "@/lib/hostelOptions";
import type { Hostel, HostelRoom, HostelSummary } from "@/lib/types";

export default function HostelDetailPage() {
  return (
    <PermissionGate permission="hostel.view">
      <HostelDetailView />
    </PermissionGate>
  );
}

function HostelDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<Hostel>(
    id ? `/v1/hostels/${id}` : null
  );
  const { data: summary } = useResource<HostelSummary>(
    id && can("hostel.export") ? `/v1/hostels/${id}/reports/summary` : null
  );
  const [version, setVersion] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Hostel not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.code}${data.type ? ` · ${data.type}` : ""}`}
        actions={
          <>
            {can("hostel.edit") ? (
              <Link
                href={`/dashboard/hostel/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            {can("hostel.create") ? (
              <Link
                href={`/dashboard/hostel/allocations/new?hostel_id=${data.id}`}
                className={buttonClasses()}
              >
                Allocate student
              </Link>
            ) : null}
            <Link
              href="/dashboard/hostel"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
      </div>

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Rooms" value={formatNumber(summary.rooms)} />
          <StatCard label="Capacity" value={formatNumber(summary.capacity)} />
          <StatCard
            label="Occupied"
            value={formatNumber(summary.occupied)}
            hint={`${formatNumber(summary.available)} beds free`}
          />
          <StatCard
            label="Pending outpasses"
            value={formatNumber(summary.pending_outpasses)}
            tone={summary.pending_outpasses > 0 ? "danger" : "positive"}
          />
        </div>
      ) : null}

      <Card className="p-6">
        <DataList>
          <DataItem label="Type" value={data.type ?? "-"} />
          <DataItem label="Warden" value={data.warden_name ?? "-"} />
          <DataItem label="Warden phone" value={data.warden_phone ?? "-"} />
          <DataItem label="Address" value={data.address ?? "-"} />
          <DataItem label="Capacity" value={formatNumber(data.capacity)} />
          <DataItem
            label="Rooms"
            value={formatNumber(data.rooms_count ?? (data.rooms ?? []).length)}
          />
        </DataList>
      </Card>

      {can("hostel.edit") ? (
        <RoomForm
          hostelId={data.id}
          onAdded={() => setVersion((current) => current + 1)}
        />
      ) : null}

      <RoomsPanel
        key={version}
        hostelId={data.id}
        canEdit={can("hostel.edit")}
        canDelete={can("hostel.delete")}
        onChanged={() => setVersion((current) => current + 1)}
      />
    </div>
  );
}

function RoomForm({
  hostelId,
  onAdded,
}: {
  hostelId: number;
  onAdded: () => void;
}) {
  const [roomNo, setRoomNo] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("double");
  const [capacity, setCapacity] = useState("2");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/hostels/${hostelId}/rooms`, {
        method: "POST",
        body: {
          room_no: roomNo,
          ...(floor ? { floor } : {}),
          type,
          capacity: Number(capacity || 1),
          ...(monthlyFee ? { monthly_fee: Number(monthlyFee) } : {}),
        },
      });
      setRoomNo("");
      setFloor("");
      setMonthlyFee("");
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to add room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Add room</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Room no." htmlFor="room_no">
          <TextInput
            id="room_no"
            value={roomNo}
            onChange={(event) => setRoomNo(event.target.value)}
          />
        </Field>
        <Field label="Floor" htmlFor="room_floor">
          <TextInput
            id="room_floor"
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="room_type">
          <Select
            id="room_type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {HOSTEL_ROOM_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity" htmlFor="room_capacity">
          <TextInput
            id="room_capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </Field>
        <Field label="Monthly fee" htmlFor="room_fee">
          <TextInput
            id="room_fee"
            type="number"
            min="0"
            step="0.01"
            value={monthlyFee}
            onChange={(event) => setMonthlyFee(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={roomNo.trim() === ""}
          onClick={submit}
        >
          Add room
        </Button>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}

function RoomsPanel({
  hostelId,
  canEdit,
  canDelete,
  onChanged,
}: {
  hostelId: number;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const { items, loading, error, meta } = useList<HostelRoom>(
    `/v1/hostels/${hostelId}/rooms`,
    { per_page: 50 }
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (roomId: number) => {
    setBusyId(roomId);
    setActionError(null);

    try {
      await apiFetch(`/v1/hostel-rooms/${roomId}`, { method: "DELETE" });
      onChanged();
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Unable to remove room.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Rooms{meta ? ` (${formatNumber(meta.total)})` : ""}
        </h2>
      </div>
      {error ? (
        <div className="p-5">
          <ErrorNotice message={error} />
        </div>
      ) : actionError ? (
        <div className="p-5">
          <ErrorNotice message={actionError} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No rooms defined yet." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Room</th>
                <th className="px-5 py-3 font-medium">Floor</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Occupancy</th>
                <th className="px-5 py-3 font-medium text-right">Fee</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((room) => (
                <tr key={room.id}>
                  <td className="px-5 py-3 text-slate-900">{room.room_no}</td>
                  <td className="px-5 py-3 text-slate-600">{room.floor ?? "-"}</td>
                  <td className="px-5 py-3 text-slate-600">{room.type ?? "-"}</td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatNumber(room.occupied)} / {formatNumber(room.capacity)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatCurrency(room.monthly_fee)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      value={
                        room.available > 0
                          ? room.occupied > 0
                            ? "partial"
                            : "vacant"
                          : "full"
                      }
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      {canEdit ? (
                        <Link
                          href={`/dashboard/hostel/rooms/${room.id}/edit`}
                          className={buttonClasses("secondary")}
                        >
                          Edit
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="secondary"
                          loading={busyId === room.id}
                          onClick={() => remove(room.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
