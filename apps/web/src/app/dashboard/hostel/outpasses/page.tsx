"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { HostelOutpass } from "@/lib/types";

export default function HostelOutpassesPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState("pending");

  const params: Record<string, string | number> = {};
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<HostelOutpass>("/v1/hostel-outpasses", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel outpasses"
        description="Requests for boarders to leave the hostel and their return."
        actions={
          can("hostel.create") ? (
            <Link
              href="/dashboard/hostel/outpasses/new"
              className={buttonClasses()}
            >
              New outpass
            </Link>
          ) : null
        }
      />

      <div className="w-52">
        <Select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="returned">Returned</option>
        </Select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No outpasses match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">From</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((outpass) => (
                  <tr key={outpass.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/hostel/outpasses/${outpass.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {outpass.student?.full_name ??
                          `#${outpass.student_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {outpass.from_datetime ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {outpass.to_datetime ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{outpass.reason}</td>
                    <td className="px-5 py-3">
                      <Badge value={outpass.status ?? "unknown"} />
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
