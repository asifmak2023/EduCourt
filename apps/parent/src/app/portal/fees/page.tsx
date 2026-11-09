"use client";

import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import { classLabel, fetchFees, formatDate, formatMoney, voucherTone } from "@/lib/portal";
import { Bar, Card, EmptyState, ErrorNotice, Pill, Skeleton, StatTile } from "@/components/ui";
import { IconWallet } from "@/components/Icons";

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
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Fees
        </h1>
        <p className="text-sm text-muted">
          Vouchers and payments{classLabel(activeChild) ? ` - ${classLabel(activeChild)}` : ""}
        </p>
      </div>

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
            <StatTile
              label="Billed"
              value={formatMoney(billed)}
              icon={<IconWallet width={16} height={16} />}
              tone="brand"
            />
            <StatTile
              label="Paid"
              value={formatMoney(paid)}
              icon={<IconWallet width={16} height={16} />}
              tone="success"
            />
            <div className="col-span-2 lg:col-span-1">
              <StatTile
                label="Outstanding"
                value={formatMoney(outstanding)}
                hint={outstanding > 0 ? "Payment due" : "All settled"}
                icon={<IconWallet width={16} height={16} />}
                tone={outstanding > 0 ? "warning" : "success"}
              />
            </div>
          </div>

          <Card>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold">Payment progress</span>
              <span className="numeric text-muted">{paidRatio}%</span>
            </div>
            <Bar value={paidRatio} tone={paidRatio >= 100 ? "success" : "warning"} />
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

          <Card padded={false} className="overflow-hidden">
            <div className="border-b px-4 py-3 sm:px-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Vouchers
              </h2>
              <p className="text-sm text-muted">Most recent billing period first</p>
            </div>
            {vouchers.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No vouchers yet"
                  message="Fee vouchers appear here once your school issues them."
                  icon={<IconWallet width={22} height={22} />}
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {[...vouchers].reverse().map((voucher) => (
                  <li key={voucher.id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{voucher.voucher_no}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Due {formatDate(voucher.due_date)}
                          {voucher.issued_at ? ` - issued ${formatDate(voucher.issued_at)}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>Amount {formatMoney(voucher.amount)}</span>
                          <span>Paid {formatMoney(voucher.paid_amount)}</span>
                          {Number(voucher.late_fee_amount ?? 0) > 0 ? (
                            <span className="text-[var(--danger)]">
                              Late fee {formatMoney(voucher.late_fee_amount)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="numeric font-[family-name:var(--font-display)] text-base font-bold">
                          {formatMoney(voucher.balance)}
                        </p>
                        <Pill tone={voucherTone(voucher.status)}>{voucher.status}</Pill>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
