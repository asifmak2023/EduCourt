"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useExams } from "@/lib/useLookups";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
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
import { formatNumber } from "@/lib/format";
import type { ExamModeration } from "@/lib/types";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
];

export default function ModerationsPage() {
  return (
    <PermissionGate permission="exam.view">
      <ModerationsTable />
    </PermissionGate>
  );
}

function ModerationsTable() {
  const { can } = useAuth();
  const { items: exams } = useExams();
  const [examId, setExamId] = useState("");
  const [status, setStatus] = useState("");

  const params: Record<string, string | number> = {};
  if (examId) params.exam_id = Number(examId);
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<ExamModeration>("/v1/exam-moderations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderations"
        description="Grace marks and scaling applied to exam papers."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.edit") ? (
              <Link
                href="/dashboard/exams/moderations/new"
                className={buttonClasses()}
              >
                New moderation
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={examId}
            onChange={(event) => {
              setPage(1);
              setExamId(event.target.value);
            }}
          >
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
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
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No moderations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Paper</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium text-right">Value</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((moderation) => (
                  <tr key={moderation.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/exams/moderations/${moderation.id}`}
                        className="hover:underline"
                      >
                        {moderation.paper?.class_room?.name ?? "-"} -{" "}
                        {moderation.paper?.subject?.name ?? "-"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {moderation.type === "grace_marks"
                        ? "Grace marks"
                        : moderation.type === "scaling"
                          ? "Scaling"
                          : "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(moderation.value)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={moderation.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {moderation.reason ?? "-"}
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
