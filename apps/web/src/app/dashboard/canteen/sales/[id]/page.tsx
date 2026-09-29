"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { CanteenSale } from "@/lib/types";

export default function CanteenSaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<CanteenSale>(
    `/v1/canteen/sales/${params.id}`
  );

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const voidSale = async () => {
    if (!confirm("Void this sale? Stock and wallet balances will be reversed.")) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await apiFetch(`/v1/canteen/sales/${params.id}/void`, { method: "POST" });
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Unable to void sale."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CanteenTabs active="sales" />
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <CanteenTabs active="sales" />
        <ErrorNotice message={error ?? "Sale not found."} />
      </div>
    );
  }

  const canVoid = can("canteen.approve") && data.status === "completed";

  return (
    <div className="space-y-6">
      <CanteenTabs active="sales" />

      <PageHeader
        title={`Bill ${data.bill_no}`}
        description={data.customer_name ?? data.student?.full_name ?? "Walk-in customer"}
        actions={
          <div className="flex gap-2">
            <Link
              href="/dashboard/canteen/sales"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {canVoid ? (
              <Button type="button" loading={busy} onClick={voidSale}>
                Void sale
              </Button>
            ) : null}
          </div>
        }
      />

      {actionError ? <ErrorNotice message={actionError} /> : null}

      <SectionCard title="Sale summary">
        <DataList>
          <DataItem
            label="Status"
            value={<Badge value={data.status ?? "unknown"} />}
          />
          <DataItem label="Payment method" value={data.payment_method ?? "-"} />
          <DataItem label="Sold on" value={data.sold_on ?? "-"} />
          <DataItem
            label="Student"
            value={data.student?.full_name ?? data.customer_name ?? "-"}
          />
          <DataItem label="Subtotal" value={formatCurrency(data.subtotal)} />
          <DataItem label="Discount" value={formatCurrency(data.discount)} />
          <DataItem
            label="Total"
            value={
              <span className="font-semibold text-foreground">
                {formatCurrency(data.total)}
              </span>
            }
          />
          <DataItem label="Cost" value={formatCurrency(data.cost_total)} />
          {data.journal_entry_id ? (
            <DataItem label="Journal entry" value={`#${data.journal_entry_id}`} />
          ) : null}
          {data.voided_at ? (
            <DataItem label="Voided at" value={data.voided_at} />
          ) : null}
          {data.notes ? <DataItem label="Notes" value={data.notes} /> : null}
        </DataList>
      </SectionCard>

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
        </div>
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Items">
            <Table.Header>
              <Table.Column isRowHeader>Item</Table.Column>
              <Table.Column className="text-right">Unit price</Table.Column>
              <Table.Column className="text-right">Quantity</Table.Column>
              <Table.Column className="text-right">Line total</Table.Column>
            </Table.Header>
            <Table.Body>
            {(data.items ?? []).map((item) => (
              <Table.Row key={item.id} id={item.id}>
                <Table.Cell className="text-foreground">{item.item_name}</Table.Cell>
                <Table.Cell className="text-right text-muted">{formatCurrency(item.unit_price)}</Table.Cell>
                <Table.Cell className="text-right text-muted">{item.quantity}</Table.Cell>
                <Table.Cell className="text-right text-foreground">{formatCurrency(item.line_total)}</Table.Cell>
              </Table.Row>
            ))}
            </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card>
    </div>
  );
}
