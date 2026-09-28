"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useRouteStops,
  useStudents,
  useTransportRoutes,
} from "@/lib/useLookups";
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
import { TRANSPORT_DIRECTION_OPTIONS } from "@/lib/transportOptions";

export default function NewTransportAllocationPage() {
  return (
    <PermissionGate permission="transport.create">
      <Suspense fallback={<Spinner />}>
        <AllocationForm />
      </Suspense>
    </PermissionGate>
  );
}

function AllocationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: students } = useStudents();
  const { items: routes } = useTransportRoutes();

  const [studentId, setStudentId] = useState("");
  const [routeId, setRouteId] = useState(
    searchParams.get("transport_route_id") ?? ""
  );
  const [stopId, setStopId] = useState("");
  const [direction, setDirection] = useState("both");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fare, setFare] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items: stops } = useRouteStops(routeId || null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch("/v1/transport/allocations", {
        method: "POST",
        body: {
          student_id: Number(studentId),
          transport_route_id: Number(routeId),
          ...(stopId ? { transport_route_stop_id: Number(stopId) } : {}),
          direction,
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
          ...(fare ? { fare: Number(fare) } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      router.push("/dashboard/transport/allocations");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to allocate.");
    } finally {
      setBusy(false);
    }
  };

  const ready = studentId !== "" && routeId !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="New transport allocation"
        description="Assign a student to a route and stop."
        actions={
          <Link
            href="/dashboard/transport/allocations"
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
            <Field label="Route" htmlFor="allocation_route" required>
              <Select
                id="allocation_route"
                value={routeId}
                onChange={(event) => {
                  setRouteId(event.target.value);
                  setStopId("");
                }}
              >
                <option value="">Select route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({route.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Stop"
              htmlFor="allocation_stop"
              hint="Optional; fare defaults to the stop or route fare."
            >
              <Select
                id="allocation_stop"
                value={stopId}
                disabled={routeId === ""}
                onChange={(event) => setStopId(event.target.value)}
              >
                <option value="">No specific stop</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.sequence}. {stop.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Direction" htmlFor="allocation_direction">
              <Select
                id="allocation_direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
              >
                {TRANSPORT_DIRECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date" htmlFor="allocation_start">
              <TextInput
                id="allocation_start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label="End date" htmlFor="allocation_end">
              <TextInput
                id="allocation_end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
            <Field label="Fare" htmlFor="allocation_fare">
              <TextInput
                id="allocation_fare"
                type="number"
                min="0"
                step="0.01"
                value={fare}
                onChange={(event) => setFare(event.target.value)}
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
              href="/dashboard/transport/allocations"
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
