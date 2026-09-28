"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useHostelRooms, useHostels, useStudents } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import { formatNumber } from "@/lib/format";

export default function NewHostelAllocationPage() {
  return (
    <PermissionGate permission="hostel.create">
      <Suspense fallback={<Spinner />}>
        <AllocationForm />
      </Suspense>
    </PermissionGate>
  );
}

function AllocationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: hostels } = useHostels();
  const { items: students } = useStudents();

  const [hostelId, setHostelId] = useState(searchParams.get("hostel_id") ?? "");
  const [roomId, setRoomId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [bedNo, setBedNo] = useState("");
  const [allocatedOn, setAllocatedOn] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items: rooms } = useHostelRooms(hostelId || null);
  const availableRooms = rooms.filter((room) => room.available > 0);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch("/v1/hostel-allocations", {
        method: "POST",
        body: {
          hostel_room_id: Number(roomId),
          student_id: Number(studentId),
          ...(bedNo ? { bed_no: bedNo } : {}),
          ...(allocatedOn ? { allocated_on: allocatedOn } : {}),
          ...(monthlyFee ? { monthly_fee: Number(monthlyFee) } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      router.push("/dashboard/hostel/allocations");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to allocate.");
    } finally {
      setBusy(false);
    }
  };

  const ready = roomId !== "" && studentId !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="New hostel allocation"
        description="Place a student in a hostel room."
        actions={
          <Link
            href="/dashboard/hostel/allocations"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            <Field label="Hostel" htmlFor="allocation_hostel" required>
              <Select
                id="allocation_hostel"
                value={hostelId}
                onChange={(event) => {
                  setHostelId(event.target.value);
                  setRoomId("");
                }}
              >
                <option value="">Select hostel</option>
                {hostels.map((hostel) => (
                  <option key={hostel.id} value={hostel.id}>
                    {hostel.name} ({hostel.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Room"
              htmlFor="allocation_room"
              required
              hint="Only rooms with free beds are listed."
            >
              <Select
                id="allocation_room"
                value={roomId}
                disabled={hostelId === ""}
                onChange={(event) => setRoomId(event.target.value)}
              >
                <option value="">Select room</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_no} ({formatNumber(room.available)} free)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Student" htmlFor="allocation_student" required>
              <Select
                id="allocation_student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} ({student.admission_no})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bed no." htmlFor="allocation_bed">
              <TextInput
                id="allocation_bed"
                value={bedNo}
                onChange={(event) => setBedNo(event.target.value)}
              />
            </Field>
            <Field label="Allocated on" htmlFor="allocation_date">
              <TextInput
                id="allocation_date"
                type="date"
                value={allocatedOn}
                onChange={(event) => setAllocatedOn(event.target.value)}
              />
            </Field>
            <Field
              label="Monthly fee"
              htmlFor="allocation_fee"
              hint="Defaults to the room fee."
            >
              <TextInput
                id="allocation_fee"
                type="number"
                min="0"
                step="0.01"
                value={monthlyFee}
                onChange={(event) => setMonthlyFee(event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes" htmlFor="allocation_notes">
                <TextArea
                  id="allocation_notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/hostel/allocations"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={!ready}>
              Allocate
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
