"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { AR_VIEW } from "@/lib/permissions";
import { apiFetch } from "@/lib/api";
import { PrintHeader } from "@/components/fee-counter/PrintHeader";
import { Spinner, ErrorNotice } from "@/components/ui";
import { amountInWords, formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/Form";
import type { FeeCharge } from "@/lib/types";

export default function BulkVoucherPrintPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <BulkVoucherPrint />
    </PermissionGate>
  );
}

function BulkVoucherPrint() {
  const searchParams = useSearchParams();
  const rawIds = searchParams?.get("ids") ?? "";

  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  const [charges, setCharges] = useState<FeeCharge[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          ids.map((id) =>
            apiFetch<{ data: FeeCharge }>(`/v1/fee-charges/${id}`)
          )
        );

        if (!active) return;

        setCharges(results.map((r) => r.data));
      } catch {
        if (!active) return;
        setError("Failed to load one or more vouchers. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
    // ids changes only when the URL changes; stringify is stable for this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIds]);

  // Auto-print once all vouchers are loaded
  useEffect(() => {
    if (!loading && charges.length > 0 && typeof window !== "undefined") {
      const timer = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, charges.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
        <span className="ml-3 text-sm text-muted">Loading vouchers…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorNotice message={error} />
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <div className="p-8 text-sm text-muted">No vouchers found.</div>
    );
  }

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between gap-3 p-4 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {charges.length} voucher{charges.length !== 1 ? "s" : ""}
          </span>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* All vouchers — each on its own print page */}
      {charges.map((charge, index) => (
        <VoucherPage
          key={charge.id}
          charge={charge}
          isLast={index === charges.length - 1}
        />
      ))}
    </div>
  );
}

function VoucherPage({
  charge,
  isLast,
}: {
  charge: FeeCharge;
  isLast: boolean;
}) {
  const amount = Number(charge.amount ?? 0);
  const discount = Number(charge.discount_amount ?? 0);
  const paid = Number(charge.paid_amount ?? 0);
  const balance = Number(charge.balance ?? 0);
  const subtotal = amount + discount;
  const lines = charge.lines ?? [];

  return (
    <div
      className={`mx-auto max-w-[820px] bg-white p-8 text-black shadow-sm print:max-w-none print:p-6 print:shadow-none${
        isLast ? "" : " mb-6 print:mb-0 print:break-after-page"
      }`}
    >
      <PrintHeader
        title="Fee Voucher"
        campus={charge.campus}
        institution={charge.institution}
      />

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <Row label="Voucher no" value={charge.voucher_no} />
          <Row
            label="Fee type"
            value={charge.billing_kind_label ?? charge.billing_kind ?? "-"}
          />
          {charge.title ? <Row label="Particulars" value={charge.title} /> : null}
        </div>
        <div className="space-y-1">
          <Row label="Issue / due date" value={formatDate(charge.due_date)} />
          <Row label="Status" value={charge.status ?? "-"} />
        </div>
      </div>

      <div className="mt-4 rounded border border-black/20 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
          Student
        </p>
        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
          <Row label="Name" value={charge.student?.full_name ?? "-"} />
          <Row label="Admission no" value={charge.student?.admission_no ?? "-"} />
          <Row label="Class" value={charge.class_room?.name ?? "-"} />
          <Row label="Section" value={charge.section?.name ?? "-"} />
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
            lines.map((line, idx) => (
              <tr key={line.id} className="border-b border-black/10">
                <td className="py-2 pr-3">{idx + 1}</td>
                <td className="py-2 pr-3">
                  {line.fee_head?.name ?? line.description ?? charge.title ?? "Fee"}
                </td>
                <td className="py-2 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-black/10">
              <td className="py-2 pr-3">1</td>
              <td className="py-2 pr-3">
                {charge.fee_head?.name ?? charge.title ?? "Fee"}
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
