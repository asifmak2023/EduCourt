"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { StudentWallet } from "@/lib/types";

export default function CanteenWalletsPage() {
  const { can } = useAuth();
  const [active, setActive] = useState("");
  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<StudentWallet>("/v1/canteen/wallets", {
      ...(active ? { is_active: active } : {}),
    });

  return (
    <div className="space-y-6">
      <CanteenTabs active="wallets" />

      <PageHeader
        title="Student wallets"
        description="Prepaid canteen balances tied to a student."
        actions={
          can("canteen.create") ? (
            <Link
              href="/dashboard/canteen/wallets/new"
              className={buttonClasses()}
            >
              Open wallet
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-72">
          <TextInput
            placeholder="Search student name or admission no."
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </div>
        <div className="w-40">
          <Select
            value={active}
            onChange={(event) => {
              setPage(1);
              setActive(event.target.value);
            }}
          >
            <option value="">All wallets</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No wallets found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                  <th className="px-5 py-3 font-medium text-right">
                    Daily limit
                  </th>
                  <th className="px-5 py-3 font-medium text-right">
                    Low threshold
                  </th>
                  <th className="px-5 py-3 font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/canteen/wallets/${wallet.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {wallet.student?.full_name ?? `Student #${wallet.student_id}`}
                      </Link>
                      {wallet.student?.admission_no ? (
                        <span className="ml-2 text-xs text-slate-400">
                          {wallet.student.admission_no}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(wallet.balance)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {wallet.daily_limit
                        ? formatCurrency(wallet.daily_limit)
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {wallet.low_balance_threshold
                        ? formatCurrency(wallet.low_balance_threshold)
                        : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={wallet.is_active ? "active" : "inactive"} />
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
