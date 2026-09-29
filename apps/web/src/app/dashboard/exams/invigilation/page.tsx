"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Invigilation duties"
                className="min-w-[720px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Invigilator</Table.Column>
                  <Table.Column>Paper</Table.Column>
                  <Table.Column>Role</Table.Column>
                  <Table.Column>Notes</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((duty) => (
                    <Table.Row key={duty.id} id={duty.id}>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/exams/invigilation/${duty.id}`}
                          className="hover:underline"
                        >
                          {duty.user?.name ?? `User #${duty.user_id}`}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {duty.paper
                          ? `${duty.paper.class_room?.name ?? "-"} - ${
                              duty.paper.subject?.name ?? "-"
                            }`
                          : `Paper #${duty.exam_paper_id}`}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={duty.role} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {duty.notes ?? "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
