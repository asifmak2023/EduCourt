"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { useJson } from "@/lib/useJson";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, TextInput } from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { FeeReceipt, Paginated } from "@/lib/types";

export default function FeeReceiptsPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <FeeReceipts />
    </PermissionGate>
  );
}

function FeeReceipts() {
  const { canAny } = useAuth();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("page", String(page));
    query.set("per_page", "50");
    return query.toString();
  }, [search, from, to, page]);

  const { data, loading, error } = useJson<Paginated<FeeReceipt>>(
    `/v1/fee-receipts?${params}`
  );

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    if (!data) {
      return;
    }

    const header = [
      "Receipt no",
      "Date",
      "Student",
      "Admission no",
      "Amount",
      "Method",
      "Reference",
    ];

    const rows = data.data.map((receipt) => [
      receipt.receipt_no,
      receipt.payment_date ?? "",
      receipt.student?.full_name ?? "",
      receipt.student?.admission_no ?? "",
      receipt.amount,
      receipt.method_label ?? receipt.method ?? "",
      receipt.reference ?? "",
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fee-receipts.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description="Fee payments recorded against student vouchers."
        actions={
          <Button type="button" variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <Card>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search" htmlFor="receipt_search">
            <TextInput
              id="receipt_search"
              value={search}
              onChange={(event) => update(setSearch)(event.target.value)}
              placeholder="Receipt no"
            />
          </Field>
          <Field label="From" htmlFor="receipt_from">
            <TextInput
              id="receipt_from"
              type="date"
              value={from}
              onChange={(event) => update(setFrom)(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="receipt_to">
            <TextInput
              id="receipt_to"
              type="date"
              value={to}
              onChange={(event) => update(setTo)(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : !data || data.data.length === 0 ? (
          <EmptyState message="No receipts match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Receipt no</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  {canAny(AR_VIEW) ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {data.data.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-border-secondary">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {receipt.receipt_no}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {formatDate(receipt.payment_date)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block text-foreground">
                        {receipt.student?.full_name ?? "-"}
                      </span>
                      <span className="block text-xs text-muted">
                        {receipt.student?.admission_no ?? ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {receipt.method_label ?? receipt.method ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {formatCurrency(receipt.amount)}
                    </td>
                    {canAny(AR_VIEW) ? (
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/dashboard/finance/accounts-receivable/receipts/${receipt.id}`}
                          className={buttonClasses("secondary")}
                        >
                          Print
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.last_page > 1 ? (
          <Pagination
            page={data.meta.current_page}
            lastPage={data.meta.last_page}
            total={data.meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
