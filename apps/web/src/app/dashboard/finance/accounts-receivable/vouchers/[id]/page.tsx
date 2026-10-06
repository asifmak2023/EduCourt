"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { AR_VIEW } from "@/lib/permissions";
import { useResource } from "@/lib/useResource";
import { PrintToolbar } from "@/components/fee-counter/PrintToolbar";
import { PrintHeader } from "@/components/fee-counter/PrintHeader";
import { EmptyState, ErrorNotice, Spinner } from "@/components/ui";
import { amountInWords, formatCurrency, formatDate } from "@/lib/format";
import type { FeeCharge } from "@/lib/types";

export default function FeeVoucherPrintPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <FeeVoucherPrint />
    </PermissionGate>
  );
}

function FeeVoucherPrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, loading, error } = useResource<FeeCharge>(
    id ? `/v1/fee-charges/${id}` : null
  );

  useEffect(() => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const autoPrint =
      new URLSearchParams(window.location.search).get("print") === "1";

    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Voucher not found." />;
  }

  const amount = Number(data.amount ?? 0);
  const discount = Number(data.discount_amount ?? 0);
  const paid = Number(data.paid_amount ?? 0);
  const balance = Number(data.balance ?? 0);
  const subtotal = amount + discount;
  const lines = data.lines ?? [];

  return (
    <div>
      <PrintToolbar
        backHref="/dashboard/finance/accounts-receivable/reports"
        backLabel="Back to receivables"
      />

      <div className="mx-auto max-w-[820px] bg-white p-8 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <PrintHeader
          title="Fee Voucher"
          campus={data.campus}
          institution={data.institution}
        />

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <Row label="Voucher no" value={data.voucher_no} />
            <Row
              label="Fee type"
              value={data.billing_kind_label ?? data.billing_kind ?? "-"}
            />
            {data.title ? <Row label="Particulars" value={data.title} /> : null}
          </div>
          <div className="space-y-1">
            <Row label="Issue / due date" value={formatDate(data.due_date)} />
            <Row label="Status" value={data.status ?? "-"} />
          </div>
        </div>

        <div className="mt-4 rounded border border-black/20 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
            Student
          </p>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Name" value={data.student?.full_name ?? "-"} />
            <Row label="Admission no" value={data.student?.admission_no ?? "-"} />
            <Row label="Class" value={data.class_room?.name ?? "-"} />
            <Row label="Section" value={data.section?.name ?? "-"} />
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/60 text-left">
              <th className="py-2 pr-3 font-semibold">#</th>
              <th className="py-2 pr-3 font-semibold">Fee head</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length > 0 ? (
              lines.map((line, index) => (
                <tr key={line.id} className="border-b border-black/10">
                  <td className="py-2 pr-3">{index + 1}</td>
                  <td className="py-2 pr-3">
                    {line.fee_head?.name ?? line.description ?? data.title ?? "Fee"}
                  </td>
                  <td className="py-2 text-right">{formatCurrency(line.amount)}</td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-black/10">
                <td className="py-2 pr-3">1</td>
                <td className="py-2 pr-3">
                  {data.fee_head?.name ?? data.title ?? "Fee"}
                </td>
                <td className="py-2 text-right">{formatCurrency(amount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="text-sm">
            <tbody>
              <TotalRow label="Subtotal" value={subtotal} />
              {discount > 0 ? (
                <TotalRow label="Discount" value={-discount} />
              ) : null}
              <TotalRow label="Payable" value={amount} strong />
              {paid > 0 ? <TotalRow label="Paid" value={paid} /> : null}
              {paid > 0 ? <TotalRow label="Balance" value={balance} strong /> : null}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm">
          <span className="font-semibold">Amount in words: </span>
          {amountInWords(amount)}
        </p>

        <div className="mt-10 flex items-end justify-between text-xs text-black/70">
          <p>Please pay on or before the due date to avoid a late fee.</p>
          <p className="border-t border-black/60 px-8 pt-1">Authorised signature</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-black/60">{label}: </span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <tr>
      <td className={`py-1 pr-8 ${strong ? "font-semibold" : ""}`}>{label}</td>
      <td className={`py-1 text-right ${strong ? "font-semibold" : ""}`}>
        {formatCurrency(Math.abs(value))}
      </td>
    </tr>
  );
}
