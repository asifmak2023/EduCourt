"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, buttonClasses, Field, TextArea } from "@/components/Form";
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
  SuccessNotice,
} from "@/components/ui";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { FeePayment } from "@/lib/types";

export default function FeePaymentDetailPage() {
  return (
    <PermissionGate permission="fee.view">
      <PaymentDetailView />
    </PermissionGate>
  );
}

function PaymentDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<FeePayment>(
    id ? `/v1/fee-payments/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Payment not found." />;
  }

  const isVoid = data.status === "void";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Receipt ${data.receipt_no}`}
        description={
          data.student
            ? `${data.student.full_name} (${data.student.admission_no})`
            : `Student #${data.student_id}`
        }
        actions={
          <Link
            href="/dashboard/fees/payments"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        <span className="text-sm text-muted">
          {formatCurrency(data.amount)} received
        </span>
      </div>

      <SectionCard title="Payment details">
        <DataList>
          <DataItem label="Receipt no" value={data.receipt_no} />
          <DataItem label="Payment date" value={formatDate(data.payment_date)} />
          <DataItem label="Amount" value={formatCurrency(data.amount)} />
          <DataItem label="Method" value={humanize(data.method)} />
          <DataItem label="Reference" value={data.reference ?? "-"} />
          <DataItem
            label="Voucher"
            value={
              data.voucher ? (
                <Link
                  href={`/dashboard/fees/${data.voucher.id}`}
                  className="text-foreground underline"
                >
                  {data.voucher.voucher_no}
                </Link>
              ) : (
                "Advance / unapplied"
              )
            }
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            {data.notes}
          </p>
        ) : null}
      </SectionCard>

      {data.voucher ? (
        <SectionCard title="Voucher summary">
          <DataList>
            <DataItem
              label="Payable"
              value={formatCurrency(data.voucher.amount)}
            />
            <DataItem
              label="Paid"
              value={formatCurrency(data.voucher.paid_amount)}
            />
            <DataItem
              label="Balance"
              value={formatCurrency(data.voucher.balance)}
            />
            <DataItem label="Due date" value={formatDate(data.voucher.due_date)} />
            <DataItem
              label="Status"
              value={<Badge value={data.voucher.status} />}
            />
          </DataList>
        </SectionCard>
      ) : null}

      {!isVoid && can("fee.approve") ? (
        <VoidPayment paymentId={data.id} onChanged={reload} />
      ) : null}
    </div>
  );
}

function VoidPayment({
  paymentId,
  onChanged,
}: {
  paymentId: number;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/fee-payments/${paymentId}/void`, {
        method: "POST",
        body: { ...(memo ? { memo } : {}) },
      });
      setOpen(false);
      setDone("Payment voided. The voucher balance has been restored.");
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Void payment</h2>
          <p className="mt-0.5 text-xs text-muted">
            Reverses the ledger entry and reopens the voucher.
          </p>
        </div>
        <Button
          variant="danger"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          Void payment
        </Button>
      </div>

      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {open ? (
        <div className="mt-5 space-y-4 border-t border-border-secondary pt-5">
          <Field label="Reason (optional)" htmlFor="void_payment_memo">
            <TextArea
              id="void_payment_memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              type="button"
              loading={busy}
              onClick={submit}
            >
              Confirm void
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
