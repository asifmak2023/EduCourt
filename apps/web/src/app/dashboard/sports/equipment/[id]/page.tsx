"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { Pagination } from "@/components/Pagination";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import { useUsers } from "@/lib/useLookups";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { EQUIPMENT_MOVEMENT_TYPE_OPTIONS } from "@/lib/sportsOptions";
import type { SportEquipment, SportEquipmentMovement } from "@/lib/types";

export default function SportEquipmentDetailPage() {
  return (
    <PermissionGate permission="sports.view">
      <EquipmentDetailView />
    </PermissionGate>
  );
}

function EquipmentDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<SportEquipment>(
    params?.id ? `/v1/sports/equipment/${params.id}` : null
  );
  const [version, setVersion] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Equipment not found." />;

  return (
    <div className="space-y-6">
      <SportsTabs active="equipment" />

      <PageHeader
        title={data.name}
        description={data.sport?.name ?? "General equipment"}
        actions={
          <>
            {can("sports.edit") ? (
              <Link
                href={`/dashboard/sports/equipment/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/sports/equipment"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Equipment">
        <DataList>
          <DataItem label="Code" value={data.code} />
          <DataItem label="Sport" value={data.sport?.name ?? "General"} />
          <DataItem
            label="Owned"
            value={`${formatNumber(data.quantity)}${data.unit ? ` ${data.unit}` : ""}`}
          />
          <DataItem
            label="Available"
            value={`${formatNumber(data.available_quantity)}${
              data.unit ? ` ${data.unit}` : ""
            }`}
          />
          <DataItem
            label="Unit cost"
            value={data.unit_cost ? formatCurrency(data.unit_cost) : "-"}
          />
          <DataItem
            label="Condition"
            value={<Badge value={data.condition ?? "unknown"} />}
          />
          <DataItem
            label="Status"
            value={
              <Badge
                value={
                  data.is_out_of_stock
                    ? "out of stock"
                    : data.is_active
                      ? "active"
                      : "inactive"
                }
              />
            }
          />
          {data.notes ? <DataItem label="Notes" value={data.notes} /> : null}
        </DataList>
      </SectionCard>

      {can("sports.edit") ? (
        <MovementForm
          equipmentId={data.id}
          onRecorded={() => {
            reload();
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <MovementHistory key={version} equipmentId={data.id} />
    </div>
  );
}

function MovementForm({
  equipmentId,
  onRecorded,
}: {
  equipmentId: number;
  onRecorded: () => void;
}) {
  const { items: users } = useUsers();
  const [type, setType] = useState("issue");
  const [quantity, setQuantity] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [movementDate, setMovementDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/v1/sports/equipment/${equipmentId}/movements`, {
        method: "POST",
        body: {
          type,
          quantity: Number(quantity),
          ...(issuedTo ? { issued_to: Number(issuedTo) } : {}),
          ...(movementDate ? { movement_date: movementDate } : {}),
          ...(remarks ? { remarks } : {}),
        },
      });
      setQuantity("");
      setRemarks("");
      onRecorded();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to record movement."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Record movement</h2>
      <p className="mt-0.5 text-xs text-muted">
        Issue reduces availability; purchase, return and adjustment change the
        tracked stock.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="movement_type">
          <Select
            id="movement_type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {EQUIPMENT_MOVEMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity" htmlFor="movement_quantity" required>
          <TextInput
            id="movement_quantity"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Issued to" htmlFor="movement_issued">
          <Select
            id="movement_issued"
            value={issuedTo}
            onChange={(event) => setIssuedTo(event.target.value)}
          >
            <option value="">Nobody</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Movement date" htmlFor="movement_date">
          <TextInput
            id="movement_date"
            type="date"
            value={movementDate}
            onChange={(event) => setMovementDate(event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Remarks" htmlFor="movement_remarks">
            <TextInput
              id="movement_remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
            />
          </Field>
        </div>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={quantity === "" || Number(quantity) === 0}
          onClick={submit}
        >
          Record movement
        </Button>
      </div>
    </Card>
  );
}

function MovementHistory({ equipmentId }: { equipmentId: number }) {
  const { items, meta, loading, error, page, setPage } =
    useList<SportEquipmentMovement>(
      `/v1/sports/equipment/${equipmentId}/movements`,
      { per_page: 25 }
    );

  return (
    <Card>
      <div className="border-b border-border-secondary px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Movement history
        </h2>
      </div>
      {error ? (
        <div className="p-5">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No movements recorded yet." />
        </div>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Movement history">
            <Table.Header>
              <Table.Column isRowHeader>Date</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column className="text-right">Quantity</Table.Column>
              <Table.Column className="text-right">Balance</Table.Column>
              <Table.Column>Issued to</Table.Column>
              <Table.Column>Remarks</Table.Column>
            </Table.Header>
            <Table.Body>
            {items.map((movement) => (
              <Table.Row key={movement.id} id={movement.id}>
                <Table.Cell className="text-muted">{formatDate(movement.movement_date)}</Table.Cell>
                <Table.Cell><Badge value={movement.type ?? "unknown"} /></Table.Cell>
                <Table.Cell className="text-right text-foreground">{formatNumber(movement.quantity)}</Table.Cell>
                <Table.Cell className="text-right text-muted">{formatNumber(movement.balance_after)}</Table.Cell>
                <Table.Cell className="text-muted">{movement.issued_to_user?.name ?? "-"}</Table.Cell>
                <Table.Cell className="text-muted">{movement.remarks ?? "-"}</Table.Cell>
              </Table.Row>
            ))}
            </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      {meta ? (
        <Pagination
          page={page}
          lastPage={meta.last_page}
          total={meta.total}
          onPage={setPage}
        />
      ) : null}
    </Card>
  );
}
