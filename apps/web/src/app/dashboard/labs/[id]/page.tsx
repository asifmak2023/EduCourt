"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
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
import { formatNumber } from "@/lib/format";
import type { Lab, LabEquipment, LabSummary } from "@/lib/types";

const CONDITIONS = [
  { value: "working", label: "Working" },
  { value: "under_repair", label: "Under repair" },
  { value: "damaged", label: "Damaged" },
  { value: "retired", label: "Retired" },
];

export default function LabDetailPage() {
  return (
    <PermissionGate permission="lab.view">
      <LabDetailView />
    </PermissionGate>
  );
}

function LabDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<Lab>(
    id ? `/v1/labs/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Lab not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.location ?? "Laboratory"}
        actions={
          <>
            <Link
              href="/dashboard/labs"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("lab.edit") ? (
              <Link
                href={`/dashboard/labs/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit lab
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
        {data.type ? <Badge value={data.type} /> : null}
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Code" value={data.code} />
          <DataItem label="Type" value={data.type ?? "-"} />
          <DataItem label="Location" value={data.location ?? "-"} />
          <DataItem label="Capacity" value={formatNumber(data.capacity)} />
          <DataItem label="In charge" value={data.incharge?.name ?? "-"} />
        </DataList>
      </Card>

      <LabSummaryCards labId={data.id} canView={can("lab.view")} />

      <EquipmentSection
        labId={data.id}
        equipment={data.equipment ?? []}
        canEdit={can("lab.edit")}
        onChanged={reload}
      />

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Bookings
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Sessions scheduled in this lab.
            </p>
          </div>
          <Link
            href={`/dashboard/labs/bookings?lab_id=${data.id}`}
            className={buttonClasses("secondary")}
          >
            View bookings
          </Link>
        </div>
      </Card>
    </div>
  );
}

function LabSummaryCards({
  labId,
  canView,
}: {
  labId: number;
  canView: boolean;
}) {
  const { data } = useResource<LabSummary>(
    canView ? `/v1/labs/${labId}/reports/summary` : null
  );

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Equipment items" value={formatNumber(data.equipment_count)} />
      <StatCard
        label="Units"
        value={formatNumber(data.equipment_quantity)}
      />
      <StatCard
        label="Needs attention"
        value={formatNumber(data.needs_attention)}
        tone={data.needs_attention > 0 ? "warning" : "positive"}
      />
      <StatCard
        label="Upcoming sessions"
        value={formatNumber(data.upcoming_sessions)}
      />
    </div>
  );
}

function EquipmentSection({
  labId,
  equipment,
  canEdit,
  onChanged,
}: {
  labId: number;
  equipment: LabEquipment[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Equipment ({equipment.length})
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Registers held in this lab.
        </p>
      </div>

      {equipment.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No equipment registered yet." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Quantity</th>
                <th className="px-5 py-3 font-medium">Condition</th>
                <th className="px-5 py-3 font-medium">Purchased</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-900">{item.name}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {item.code ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={item.condition ?? "unknown"} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {item.purchased_on ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {canEdit ? (
                      <Link
                        href={`/dashboard/labs/${labId}/equipment/${item.id}/edit`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        Edit
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit ? (
        <AddEquipmentForm labId={labId} onAdded={onChanged} />
      ) : null}
    </Card>
  );
}

function AddEquipmentForm({
  labId,
  onAdded,
}: {
  labId: number;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState("working");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/labs/${labId}/equipment`, {
        method: "POST",
        body: {
          name,
          ...(code ? { code } : {}),
          quantity: Number(quantity),
          condition,
          ...(purchasedOn ? { purchased_on: purchasedOn } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      setName("");
      setCode("");
      setQuantity("1");
      setCondition("working");
      setPurchasedOn("");
      setNotes("");
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to add equipment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Add equipment
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" htmlFor="equip_name" required>
          <TextInput
            id="equip_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Code" htmlFor="equip_code">
          <TextInput
            id="equip_code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="Quantity" htmlFor="equip_qty">
          <TextInput
            id="equip_qty"
            type="number"
            min="0"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Condition" htmlFor="equip_condition">
          <Select
            id="equip_condition"
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
          >
            {CONDITIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purchased on" htmlFor="equip_purchased">
          <TextInput
            id="equip_purchased"
            type="date"
            value={purchasedOn}
            onChange={(event) => setPurchasedOn(event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Notes" htmlFor="equip_notes">
            <TextArea
              id="equip_notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button type="button" loading={busy} disabled={!name} onClick={add}>
          Add equipment
        </Button>
      </div>
    </div>
  );
}
