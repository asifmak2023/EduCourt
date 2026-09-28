"use client";

import { useState } from "react";
import Link from "next/link";
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
import type { CanteenSale } from "@/lib/types";

export default function CanteenSalesPage() {
  const { can } = useAuth();
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params: Record<string, string | number> = {};
  if (method) params.payment_method = method;
  if (status) params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;

  const { items, meta, loading, error, page, setPage } =
    useList<CanteenSale>("/v1/canteen/sales", params);

  return (
    <div className="space-y-6">
      <CanteenTabs active="sales" />

      <PageHeader
        title="Canteen sales"
        description="Point-of-sale bills and their payment status."
        actions={
          can("canteen.create") ? (
            <Link
              href="/dashboard/canteen/sales/new"
              className={buttonClasses()}
            >
              New sale
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            value={method}
            onChange={(event) => {
              setPage(1);
              setMethod(event.target.value);
            }}
          >
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="wallet">Wallet</option>
            <option value="credit">Credit</option>
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="void">Void</option>
          </Select>
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
          />
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
          />
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No sales match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Bill</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Sold on</th>
                  <th className="px-5 py-3 font-medium text-right">Subtotal</th>
                  <th className="px-5 py-3 font-medium text-right">Discount</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/canteen/sales/${sale.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {sale.bill_no}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {sale.student?.full_name ?? sale.customer_name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {sale.payment_method ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {sale.sold_on ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(sale.subtotal)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(sale.discount)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={sale.status ?? "unknown"} />
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
