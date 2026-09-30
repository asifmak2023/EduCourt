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
import { CanteenTabs } from "@/components/CanteenTabs";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type { CanteenItem, CanteenStockEntry } from "@/lib/types";

export default function CanteenItemDetailPage() {
  return (
    <PermissionGate permission="canteen.view">
      <ItemDetailView />
    </PermissionGate>
  );
}

function ItemDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<CanteenItem>(
    id ? `/v1/canteen/items/${id}` : null
  );
  const [version, setVersion] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Item not found." />;

  return (
    <div className="space-y-6">
      <CanteenTabs active="items" />

      <PageHeader
        title={data.name}
        description={`${data.code}${data.category ? ` · ${data.category}` : ""}`}
        actions={
          <>
            {can("canteen.edit") ? (
              <Link
                href={`/dashboard/canteen/items/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link
              href="/dashboard/canteen/items"
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
          <DataItem label="Sale price" value={formatCurrency(data.price)} />
          <DataItem label="Cost price" value={formatCurrency(data.cost_price)} />
          <DataItem
            label="Stock"
            value={
              data.track_stock
                ? `${formatNumber(data.stock_quantity)}${
                    data.unit ? ` ${data.unit}` : ""
                  }`
                : "Not tracked"
            }
          />
          <DataItem
            label="Reorder level"
            value={formatNumber(data.reorder_level)}
          />
          <DataItem label="Unit" value={data.unit ?? "-"} />
          <DataItem label="Category" value={data.category ?? "-"} />
        </DataList>
        {data.description ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            {data.description}
          </p>
        ) : null}
      </Card>

      {can("canteen.approve") && data.track_stock ? (
        <AdjustStockForm
          itemId={data.id}
          onAdjusted={() => {
            reload();
            setVersion((current) => current + 1);
          }}
        />
      ) : null}

      <StockEntryPanel key={version} itemId={data.id} />
    </div>
  );
}

function AdjustStockForm({
  itemId,
  onAdjusted,
}: {
  itemId: number;
  onAdjusted: () => void;
}) {
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/canteen/items/${itemId}/adjust-stock`, {
        method: "POST",
        body: {
          quantity: Number(quantity),
          ...(unitCost ? { unit_cost: Number(unitCost) } : {}),
          ...(notes ? { notes } : {}),
        },
      });
      setQuantity("");
      setUnitCost("");
      setNotes("");
      onAdjusted();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to adjust stock.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Adjust stock</h2>
      <p className="mt-0.5 text-xs text-muted">
        Enter a positive quantity to add stock or a negative quantity to
        correct it down.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Quantity" htmlFor="adjust_quantity">
          <TextInput
            id="adjust_quantity"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Unit cost" htmlFor="adjust_cost">
          <TextInput
            id="adjust_cost"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
          />
        </Field>
        <Field label="Notes" htmlFor="adjust_notes">
          <TextInput
            id="adjust_notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          loading={busy}
          disabled={quantity.trim() === "" || Number(quantity) === 0}
          onClick={submit}
        >
          Apply adjustment
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

function StockEntryPanel({ itemId }: { itemId: number }) {
  const { items, loading, error } = useList<CanteenStockEntry>(
    "/v1/canteen/stock-entries",
    { canteen_item_id: itemId, per_page: 25 }
  );

  return (
    <Card>
      <div className="border-b border-border-secondary px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Stock history</h2>
      </div>
      {error ? (
        <div className="p-5">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No stock movements recorded." />
        </div>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Stock history">
            <Table.Header>
              <Table.Column isRowHeader>Date</Table.Column>
              <Table.Column>Type</Table.Column>
              <Table.Column className="text-right">Quantity</Table.Column>
              <Table.Column className="text-right">Balance</Table.Column>
              <Table.Column>Reference</Table.Column>
            </Table.Header>
            <Table.Body>
            {items.map((entry) => (
              <Table.Row key={entry.id} id={entry.id}>
                <Table.Cell className="text-foreground">{formatDate(entry.entry_date)}</Table.Cell>
                <Table.Cell><Badge value={entry.type ?? "unknown"} /></Table.Cell>
                <Table.Cell className="text-right text-foreground">{formatNumber(entry.quantity)}</Table.Cell>
                <Table.Cell className="text-right text-muted">{formatNumber(entry.balance_after)}</Table.Cell>
                <Table.Cell className="text-muted">{entry.reference ?? entry.notes ?? "-"}</Table.Cell>
              </Table.Row>
            ))}
            </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </Card>
  );
}
