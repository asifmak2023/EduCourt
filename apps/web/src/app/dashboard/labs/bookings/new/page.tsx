"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useClassRooms, useLabs, useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";

export default function NewLabBookingPage() {
  return (
    <PermissionGate permission="lab.create">
      <BookingForm />
    </PermissionGate>
  );
}

function BookingForm() {
  const router = useRouter();
  const { items: labs, loading } = useLabs();
  const { items: classes } = useClassRooms();
  const { items: users } = useUsers();

  const [labId, setLabId] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<{ data: { id: number } }>(
        "/v1/lab-bookings",
        {
          method: "POST",
          body: {
            lab_id: Number(labId),
            ...(classRoomId ? { class_room_id: Number(classRoomId) } : {}),
            ...(teacherId ? { teacher_user_id: Number(teacherId) } : {}),
            session_date: sessionDate,
            start_time: startTime,
            end_time: endTime,
            ...(purpose ? { purpose } : {}),
          },
        }
      );
      router.push(`/dashboard/labs/bookings/${response.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to book the lab.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New lab booking"
        description="Reserve a lab for a class session."
        actions={
          <Link
            href="/dashboard/labs/bookings"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lab" htmlFor="booking_lab" required>
            <Select
              id="booking_lab"
              value={labId}
              onChange={(event) => setLabId(event.target.value)}
            >
              <option value="">Select lab</option>
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Class" htmlFor="booking_class">
            <Select
              id="booking_class"
              value={classRoomId}
              onChange={(event) => setClassRoomId(event.target.value)}
            >
              <option value="">Optional</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Teacher" htmlFor="booking_teacher">
            <Select
              id="booking_teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="">Optional</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Session date" htmlFor="booking_date" required>
            <TextInput
              id="booking_date"
              type="date"
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
            />
          </Field>

          <Field label="Start time" htmlFor="booking_start" required>
            <TextInput
              id="booking_start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </Field>

          <Field label="End time" htmlFor="booking_end" required>
            <TextInput
              id="booking_end"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Purpose" htmlFor="booking_purpose">
              <TextInput
                id="booking_purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            loading={busy}
            disabled={!labId || !sessionDate || !startTime || !endTime}
            onClick={submit}
          >
            Book lab
          </Button>
        </div>
      </Card>
    </div>
  );
}
