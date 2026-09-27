"use client";

import { useState } from "react";
import { useList } from "@/lib/useList";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FeeVoucher } from "@/lib/types";

const STATUSES = ["", "unpaid", "partial", "paid", "void"];

export default function FeesPage() {
  return (
    <PermissionGate permission="fee.view">
      <VouchersTable />
    </PermissionGate>
  );
}

function VouchersTable() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { items, meta, loading, error, page, setPage, setSearch: setApplied } =
    useList<FeeVoucher>(
      "/v1/fee-vouchers",
      status === "" ? {} : { status }
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee vouchers"
        description="Issued vouchers, payments received and outstanding balances."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              {STATUSES.map((option) => (
                <option key={option || "all"} value={option}>
                  {option === "" ? "All statuses" : option}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
                setApplied(event.target.value);
              }}
              placeholder="Search voucher no"
              className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No fee vouchers match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Voucher no</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Paid</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Due date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {voucher.voucher_no}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {voucher.student?.full_name ?? `Student #${voucher.id}`}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(voucher.amount)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {formatCurrency(voucher.paid_amount)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(voucher.balance)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(voucher.due_date)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={voucher.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
