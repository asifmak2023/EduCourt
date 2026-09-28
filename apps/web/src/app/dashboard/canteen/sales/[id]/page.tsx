"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
              <span className="font-semibold text-slate-900">
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
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Items</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium text-right">Unit price</th>
              <th className="px-5 py-3 font-medium text-right">Quantity</th>
              <th className="px-5 py-3 font-medium text-right">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data.items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3 text-slate-900">{item.item_name}</td>
                <td className="px-5 py-3 text-right text-slate-600">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="px-5 py-3 text-right text-slate-600">
                  {item.quantity}
                </td>
                <td className="px-5 py-3 text-right text-slate-900">
                  {formatCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
