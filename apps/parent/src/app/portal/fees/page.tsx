"use client";

import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import {
  classLabel,
  fetchFees,
  formatDate,
  formatMoney,
  formatRupees,
  voucherTone,
} from "@/lib/portal";
import { Card, EmptyState, ErrorNotice, PageTitle, Pill, Skeleton } from "@/components/ui";
import { IconReceipt } from "@/components/Icons";
import type { FeeVoucher } from "@/lib/types";

function StatBlock({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "brand" | "success" | "danger" | "muted";
}) {
  const cls =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[var(--redpen)]"
        : tone === "brand"
          ? "text-foreground"
          : "text-muted";
  return (
    <div className="rounded-lg border border-hairline bg-card px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`numeric mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-none ${cls}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

function VoucherStub({ voucher }: { voucher: FeeVoucher }) {
  const balance = Number(voucher.balance);
  const overdue =
    balance > 0 && voucher.due_date ? new Date(voucher.due_date) < new Date() : false;

  return (
    <li className="relative flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold uppercase tracking-wide text-foreground">
            {voucher.voucher_no}
          </p>
          <Pill tone={voucherTone(voucher.status)}>{voucher.status}</Pill>
        </div>
        <p className="mt-1 text-xs text-muted">
          Due {formatDate(voucher.due_date)}
          {voucher.issued_at ? ` · issued ${formatDate(voucher.issued_at)}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>Amount {formatMoney(voucher.amount)}</span>
          <span>Paid {formatMoney(voucher.paid_amount)}</span>
          {Number(voucher.late_fee_amount ?? 0) > 0 ? (
            <span className="text-[var(--redpen)]">
              Late fee {formatMoney(voucher.late_fee_amount)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {balance > 0 ? (
          <p className="numeric font-[family-name:var(--font-display)] text-lg font-bold leading-none text-foreground">
            Rs {formatRupees(balance)}
          </p>
        ) : (
          <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase leading-none text-[var(--success)]">
            Settled
          </p>
        )}
        <p className={`mt-1 text-[11px] ${overdue ? "text-[var(--redpen)]" : "text-muted"}`}>
          {balance > 0 ? (overdue ? "overdue" : "awaiting payment") : "paid in full"}
        </p>
      </div>
    </li>
  );
}

export default function FeesPage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(activeChildId, fetchFees, ready);

  const billed = Number(data?.totals.billed ?? 0);
  const paid = Number(data?.totals.paid ?? 0);
  const outstanding = Number(data?.totals.outstanding ?? 0);
  const paidRatio = billed > 0 ? Math.round((paid / billed) * 100) : 100;

  const vouchers = data?.data ?? [];
  const unpaid = vouchers.filter((voucher) => voucher.status !== "paid");

  return (
    <div className="space-y-5">
      <PageTitle
        eyebrow={classLabel(activeChild) ? `Ledger · ${classLabel(activeChild)}` : "Ledger"}
        title="Fees"
      />

      {busy ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatBlock label="Billed" value={`Rs ${formatRupees(billed)}`} tone="brand" />
            <StatBlock
              label="Paid"
              value={`Rs ${formatRupees(paid)}`}
              hint={`${paidRatio}% of billed`}
              tone="success"
            />
            <div className="col-span-2 lg:col-span-1">
              <StatBlock
                label="Outstanding"
                value={`Rs ${formatRupees(outstanding)}`}
                hint={outstanding > 0 ? "payment due" : "all settled"}
                tone={outstanding > 0 ? "danger" : "success"}
              />
            </div>
          </div>

          {/* payment progress on ruled paper */}
          <Card>
            <div className="mb-2 flex items-end justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                Payment progress
              </h2>
              <span className="numeric font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                {paidRatio}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, paidRatio))}%`,
                  backgroundColor:
                    paidRatio >= 100 ? "var(--success)" : "var(--marigold)",
                }}
              />
            </div>
            {unpaid.length > 0 ? (
              <p className="mt-3 text-xs text-muted">
                {unpaid.length} voucher{unpaid.length > 1 ? "s" : ""} still open. Pay at
                the school office or via your usual method.
              </p>
            ) : (
              <p className="mt-3 text-xs text-[var(--success)]">
                Every voucher is fully paid. Thank you.
              </p>
            )}
          </Card>

          {/* vouchers */}
          <Card padded={false} className="overflow-hidden">
            <div className="border-b border-hairline px-4 py-3 sm:px-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                Vouchers
              </h2>
              <p className="text-xs text-muted">Most recent billing period first</p>
            </div>
            {vouchers.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No vouchers yet"
                  message="Fee vouchers appear here once your school issues them."
                  icon={<IconReceipt width={22} height={22} />}
                />
              </div>
            ) : (
              <ul className="divide-y divide-dashed divide-rule">
                {[...vouchers].reverse().map((voucher) => (
                  <VoucherStub key={voucher.id} voucher={voucher} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
