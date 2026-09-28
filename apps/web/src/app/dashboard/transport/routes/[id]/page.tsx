"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TransportRoute, TransportRouteStop } from "@/lib/types";

export default function TransportRouteDetailPage() {
  return (
    <PermissionGate permission="transport.view">
      <RouteDetailView />
    </PermissionGate>
  );
}

function RouteDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<TransportRoute>(
    id ? `/v1/transport/routes/${id}` : null
  );
  const [version, setVersion] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Route not found." />;

  const stops = (data.stops ?? []).slice().sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.code}${
          data.start_point || data.end_point
            ? ` · ${data.start_point ?? "-"} to ${data.end_point ?? "-"}`
            : ""
        }`}
        actions={
          <>
            {can("transport.edit") ? (
              <Link
                href={`/dashboard/transport/routes/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            {can("transport.create") ? (
              <Link
                href={`/dashboard/transport/allocations/new?transport_route_id=${data.id}`}
                className={buttonClasses()}
              >
                Allocate student
              </Link>
            ) : null}
            <Link
              href="/dashboard/transport/routes"
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

      <Card className="p-6">
        <DataList>
          <DataItem label="Vehicle" value={data.vehicle?.name ?? "Unassigned"} />
          <DataItem
            label="Distance"
            value={`${formatNumber(data.distance_km)} km`}
          />
          <DataItem label="Base fare" value={formatCurrency(data.fare)} />
          <DataItem
            label="Stops"
            value={formatNumber(data.stops_count ?? stops.length)}
          />
          <DataItem
            label="Riders"
            value={formatNumber(data.allocations_count ?? 0)}
          />
        </DataList>
      </Card>

      {can("transport.edit") ? (
        <StopForm
          routeId={data.id}
          nextSequence={stops.length + 1}
          onAdded={() => {
            reload();
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <StopsPanel
        stops={stops}
        canEdit={can("transport.edit")}
        onDeleted={() => {
          reload();
          setVersion((current) => current + 1);
        }}
        version={version}
      />
    </div>
  );
}

function StopForm({
  routeId,
  nextSequence,
  onAdded,
}: {
  routeId: number;
  nextSequence: number;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [sequence, setSequence] = useState(String(nextSequence));
  const [pickupTime, setPickupTime] = useState("");
  const [dropTime, setDropTime] = useState("");
  const [fare, setFare] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/transport/routes/${routeId}/stops`, {
        method: "POST",
        body: {
          name,
          sequence: Number(sequence || 1),
          ...(pickupTime ? { pickup_time: pickupTime } : {}),
          ...(dropTime ? { drop_time: dropTime } : {}),
          ...(fare ? { fare: Number(fare) } : {}),
        },
      });
      setName("");
      setPickupTime("");
      setDropTime("");
      setFare("");
      setSequence(String(nextSequence + 1));
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to add stop.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Add stop</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Stops are ordered by sequence along the route.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Stop name" htmlFor="stop_name">
          <TextInput
            id="stop_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Sequence" htmlFor="stop_sequence">
          <TextInput
            id="stop_sequence"
            type="number"
            min="1"
            value={sequence}
            onChange={(event) => setSequence(event.target.value)}
          />
        </Field>
        <Field label="Pickup time" htmlFor="stop_pickup">
          <TextInput
            id="stop_pickup"
            type="time"
            value={pickupTime}
            onChange={(event) => setPickupTime(event.target.value)}
          />
        </Field>
        <Field label="Drop time" htmlFor="stop_drop">
          <TextInput
            id="stop_drop"
            type="time"
            value={dropTime}
            onChange={(event) => setDropTime(event.target.value)}
          />
        </Field>
        <Field label="Fare" htmlFor="stop_fare">
          <TextInput
            id="stop_fare"
            type="number"
            min="0"
            step="0.01"
            value={fare}
            onChange={(event) => setFare(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={name.trim() === ""}
          onClick={submit}
        >
          Add stop
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

function StopsPanel({
  stops,
  canEdit,
  onDeleted,
  version,
}: {
  stops: TransportRouteStop[];
  canEdit: boolean;
  onDeleted: () => void;
  version: number;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (stopId: number) => {
    setBusyId(stopId);
    setError(null);

    try {
      await apiFetch(`/v1/transport/stops/${stopId}`, { method: "DELETE" });
      onDeleted();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to remove stop.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Stops ({stops.length})
        </h2>
      </div>
      {error ? (
        <div className="p-5">
          <ErrorNotice message={error} />
        </div>
      ) : stops.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No stops defined for this route." />
        </div>
      ) : (
        <table className="w-full text-left text-sm" key={version}>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Stop</th>
              <th className="px-5 py-3 font-medium">Pickup</th>
              <th className="px-5 py-3 font-medium">Drop</th>
              <th className="px-5 py-3 font-medium text-right">Fare</th>
              {canEdit ? <th className="px-5 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stops.map((stop) => (
              <tr key={stop.id}>
                <td className="px-5 py-3 text-slate-500">{stop.sequence}</td>
                <td className="px-5 py-3 text-slate-900">{stop.name}</td>
                <td className="px-5 py-3 text-slate-600">
                  {stop.pickup_time ?? "-"}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {stop.drop_time ?? "-"}
                </td>
                <td className="px-5 py-3 text-right text-slate-900">
                  {stop.fare === null ? "-" : formatCurrency(stop.fare)}
                </td>
                {canEdit ? (
                  <td className="px-5 py-3 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      loading={busyId === stop.id}
                      onClick={() => remove(stop.id)}
                    >
                      Remove
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
