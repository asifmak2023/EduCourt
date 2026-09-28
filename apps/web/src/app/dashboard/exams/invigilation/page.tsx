"use client";

import { useState } from "react";
import Link from "next/link";
import { useList } from "@/lib/useList";
import { useExamPapers, useUsers } from "@/lib/useLookups";
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
import type { InvigilationDuty } from "@/lib/types";

export default function InvigilationPage() {
  return (
    <PermissionGate permission="exam.view">
      <InvigilationTable />
    </PermissionGate>
  );
}

function InvigilationTable() {
  const { can } = useAuth();
  const { items: papers } = useExamPapers();
  const { items: users } = useUsers();

  const [paperId, setPaperId] = useState("");
  const [userId, setUserId] = useState("");

  const params: Record<string, string | number> = {};
  if (paperId) params.exam_paper_id = Number(paperId);
  if (userId) params.user_id = Number(userId);

  const { items, meta, loading, error, page, setPage } =
    useList<InvigilationDuty>("/v1/invigilation-duties", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invigilation"
        description="Staff assigned to supervise exam papers."
        actions={
          <>
            <Link href="/dashboard/exams" className={buttonClasses("secondary")}>
              Back
            </Link>
            {can("exam.edit") ? (
              <Link
                href="/dashboard/exams/invigilation/new"
                className={buttonClasses()}
              >
                Assign invigilator
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={paperId}
            onChange={(event) => {
              setPage(1);
              setPaperId(event.target.value);
            }}
          >
            <option value="">All papers</option>
            {papers.map((paper) => (
              <option key={paper.id} value={paper.id}>
                {paper.class_room?.name ?? `Class ${paper.class_room_id}`} -{" "}
                {paper.subject?.name ?? `Subject ${paper.subject_id}`}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Select
            value={userId}
            onChange={(event) => {
              setPage(1);
              setUserId(event.target.value);
            }}
          >
            <option value="">All staff</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
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
          <EmptyState message="No invigilation duties match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Invigilator</th>
                  <th className="px-5 py-3 font-medium">Paper</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((duty) => (
                  <tr key={duty.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link
                        href={`/dashboard/exams/invigilation/${duty.id}`}
                        className="hover:underline"
                      >
                        {duty.user?.name ?? `User #${duty.user_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {duty.paper
                        ? `${duty.paper.class_room?.name ?? "-"} - ${
                            duty.paper.subject?.name ?? "-"
                          }`
                        : `Paper #${duty.exam_paper_id}`}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={duty.role} />
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {duty.notes ?? "-"}
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
