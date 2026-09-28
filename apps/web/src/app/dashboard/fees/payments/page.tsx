"use client";

import { useState } from "react";
import Link from "next/link";
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
import { buttonClasses } from "@/components/Form";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import type { FeePayment } from "@/lib/types";

const METHODS = [
  { value: "", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "void", label: "Void" },
];

export default function FeePaymentsPage() {
  return (
    <PermissionGate permission="fee.view">
      <PaymentsTable />
    </PermissionGate>
  );
}

function PaymentsTable() {
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  const filters: Record<string, string> = {};
  if (method) filters.method = method;
  if (status) filters.status = status;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<FeePayment>("/v1/fee-payments", filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee payments"
        description="Receipts recorded across all vouchers."
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search receipt or student"
              className="w-60 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
            <Link
              href="/dashboard/fees"
              className={buttonClasses("secondary")}
            >
              Vouchers
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={method}
          onChange={(event) => {
            setPage(1);
            setMethod(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {METHODS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {STATUSES.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No payments match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Receipt no</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Voucher</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      <Link
                        href={`/dashboard/fees/payments/${payment.id}`}
                        className="hover:underline"
                      >
                        {payment.receipt_no}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {payment.student ? (
                        <Link
                          href={`/dashboard/students/${payment.student.id}`}
                          className="hover:underline"
                        >
                          {payment.student.full_name}
                        </Link>
                      ) : (
                        `Student #${payment.student_id}`
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {payment.voucher ? (
                        <Link
                          href={`/dashboard/fees/${payment.voucher.id}`}
                          className="hover:underline"
                        >
                          {payment.voucher.voucher_no}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {humanize(payment.method)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={payment.status} />
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
