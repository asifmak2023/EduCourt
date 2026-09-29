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
import { Button, buttonClasses, Field, Select, TextArea, TextInput } from "@/components/Form";
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
import { INVENTORY_MOVEMENT_TYPE_OPTIONS } from "@/lib/inventoryOptions";
import type { InventoryItem, InventoryStockMovement } from "@/lib/types";

export default function InventoryItemDetailPage() {
  return (
    <PermissionGate permission="inventory.view">
      <ItemDetailView />
    </PermissionGate>
  );
}

function ItemDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<InventoryItem>(
    id ? `/v1/inventory/items/${id}` : null
  );
  const [version, setVersion] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Item not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.code}${data.category ? ` · ${data.category.name}` : ""}`}
        actions={
          <>
            {can("inventory.edit") ? (
              <Link
                href={`/dashboard/inventory/items/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/inventory/items"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
        {data.is_low_stock ? <Badge value="low stock" /> : null}
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="On hand"
            value={`${formatNumber(data.quantity)}${
              data.unit ? ` ${data.unit}` : ""
            }`}
          />
          <DataItem label="Reorder level" value={formatNumber(data.reorder_level)} />
          <DataItem label="Unit cost" value={formatCurrency(data.unit_cost)} />
          <DataItem
            label="Stock value"
            value={formatCurrency(data.quantity * data.unit_cost)}
          />
          <DataItem label="Category" value={data.category?.name ?? "Uncategorised"} />
          <DataItem label="Unit" value={data.unit ?? "-"} />
        </DataList>
      </Card>

      {can("inventory.edit") ? (
        <MovementForm
          itemId={data.id}
          onRecorded={() => {
            reload();
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <MovementsPanel key={version} itemId={data.id} />
    </div>
  );
}

function MovementForm({
  itemId,
  onRecorded,
}: {
  itemId: number;
  onRecorded: () => void;
}) {
  const [type, setType] = useState("purchase");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reference, setReference] = useState("");
  const [movedOn, setMovedOn] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/inventory/items/${itemId}/movements`, {
        method: "POST",
        body: {
          type,
          quantity: Number(quantity || 0),
          ...(unitCost ? { unit_cost: Number(unitCost) } : {}),
          ...(reference ? { reference } : {}),
          ...(movedOn ? { moved_on: movedOn } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      setQuantity("");
      setUnitCost("");
      setReference("");
      setMovedOn("");
      setNotes("");
      onRecorded();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to record movement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Record movement</h2>
      <p className="mt-0.5 text-xs text-muted">
        Purchases and returns add stock; issues and wastage reduce it. An
        adjustment applies the quantity as a signed change.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="movement_type">
          <Select
            id="movement_type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {INVENTORY_MOVEMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity" htmlFor="movement_quantity">
          <TextInput
            id="movement_quantity"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Unit cost" htmlFor="movement_unit_cost">
          <TextInput
            id="movement_unit_cost"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
          />
        </Field>
        <Field label="Reference" htmlFor="movement_reference">
          <TextInput
            id="movement_reference"
            value={reference}
            placeholder="Invoice or slip no."
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        <Field label="Moved on" htmlFor="movement_date">
          <TextInput
            id="movement_date"
            type="date"
            value={movedOn}
            onChange={(event) => setMovedOn(event.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="movement_notes">
            <TextArea
              id="movement_notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={quantity.trim() === ""}
          onClick={submit}
        >
          Record movement
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

function MovementsPanel({ itemId }: { itemId: number }) {
  const { items, loading, error, meta } = useList<InventoryStockMovement>(
    `/v1/inventory/items/${itemId}/movements`,
    { per_page: 50 }
  );

  return (
    <Card>
      <div className="border-b border-border-secondary px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Stock movements
          {meta ? ` (${formatNumber(meta.total)})` : ""}
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
        <div className="overflow-x-auto">
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Stock movements">
              <Table.Header>
                <Table.Column isRowHeader>Date</Table.Column>
                <Table.Column>Type</Table.Column>
                <Table.Column className="text-right">Quantity</Table.Column>
                <Table.Column className="text-right">Unit cost</Table.Column>
                <Table.Column>Reference</Table.Column>
              </Table.Header>
              <Table.Body>
              {items.map((movement) => (
                <Table.Row key={movement.id} id={movement.id}>
                  <Table.Cell className="text-foreground">{movement.moved_on ?? "-"}</Table.Cell>
                  <Table.Cell><Badge value={movement.type ?? "unknown"} /></Table.Cell>
                  <Table.Cell className="text-right text-foreground">{formatNumber(movement.quantity)}</Table.Cell>
                  <Table.Cell className="text-right text-muted">{formatCurrency(movement.unit_cost)}</Table.Cell>
                  <Table.Cell className="text-muted">{movement.reference ?? "-"}</Table.Cell>
                </Table.Row>
              ))}
              </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      )}
    </Card>
  );
}
