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
import type { FeeReceipt } from "@/lib/types";

export default function FeeReceiptPrintPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <FeeReceiptPrint />
    </PermissionGate>
  );
}

function FeeReceiptPrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, loading, error } = useResource<FeeReceipt>(
    id ? `/v1/fee-receipts/${id}` : null
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
    return <EmptyState message="Receipt not found." />;
  }

  const amount = Number(data.amount ?? 0);
  const allocations = data.allocations ?? [];
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount ?? 0),
    0
  );

  return (
    <div>
      <PrintToolbar
        backHref="/dashboard/finance/accounts-receivable/receipts"
        backLabel="Back to receipts"
      />

      <div className="mx-auto max-w-[820px] bg-white p-8 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <PrintHeader
          title="Fee Receipt"
          campus={data.campus}
          institution={data.institution}
        />

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <Row label="Receipt no" value={data.receipt_no} />
            <Row label="Date" value={formatDate(data.payment_date)} />
          </div>
          <div className="space-y-1">
            <Row
              label="Method"
              value={data.method_label ?? data.method ?? "-"}
            />
            <Row label="Reference" value={data.reference ?? "-"} />
          </div>
        </div>

        <div className="mt-4 rounded border border-black/20 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
            Received from
          </p>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="Name" value={data.student?.full_name ?? "-"} />
            <Row label="Admission no" value={data.student?.admission_no ?? "-"} />
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/60 text-left">
              <th className="py-2 pr-3 font-semibold">#</th>
              <th className="py-2 pr-3 font-semibold">Voucher</th>
              <th className="py-2 pr-3 font-semibold">Particulars</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {allocations.length === 0 ? (
              <tr className="border-b border-black/10">
                <td className="py-2 pr-3">1</td>
                <td className="py-2 pr-3">-</td>
                <td className="py-2 pr-3">Fee payment</td>
                <td className="py-2 text-right">{formatCurrency(amount)}</td>
              </tr>
            ) : (
              allocations.map((allocation, index) => (
                <tr key={allocation.id} className="border-b border-black/10">
                  <td className="py-2 pr-3">{index + 1}</td>
                  <td className="py-2 pr-3">
                    {allocation.charge?.voucher_no ?? "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {allocation.charge?.title ??
                      allocation.charge?.billing_kind_label ??
                      "Fee"}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(allocation.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-8 font-semibold">Total received</td>
                <td className="py-1 text-right font-semibold">
                  {formatCurrency(allocations.length === 0 ? amount : totalAllocated)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm">
          <span className="font-semibold">Amount in words: </span>
          {amountInWords(amount)}
        </p>

        {data.notes ? (
          <p className="mt-2 text-xs text-black/70">Note: {data.notes}</p>
        ) : null}

        <div className="mt-12 flex items-end justify-between text-xs text-black/70">
          <p>This is a computer-generated receipt.</p>
          <p className="border-t border-black/60 px-8 pt-1">Received by</p>
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
