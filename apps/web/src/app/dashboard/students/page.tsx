"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Student } from "@/lib/types";

const STATUS_OPTIONS: { value: string; label: MessageKey }[] = [
  { value: "", label: "status.all" },
  { value: "active", label: "status.active" },
  { value: "inactive", label: "status.inactive" },
  { value: "graduated", label: "status.graduated" },
  { value: "transferred", label: "status.transferred" },
  { value: "withdrawn", label: "status.withdrawn" },
];

export default function StudentsPage() {
  return (
    <PermissionGate permission="student.view">
      <StudentsTable />
    </PermissionGate>
  );
}

function StudentsTable() {
  const { can } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Student>("/v1/students", { status, gender });

  return (
    <div className="space-y-6">
      <PageHeader
        title="students.title"
        description="students.description"
        actions={
          <>
            <div className="w-56">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="students.searchPlaceholder"
              />
            </div>
            {can("student.create") ? (
              <Link
                href="/dashboard/students/new"
                className={buttonClasses("primary")}
              >
                {t("students.new")}
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-52">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label)}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={gender}
            onChange={(event) => {
              setPage(1);
              setGender(event.target.value);
            }}
          >
            <option value="">{t("gender.all")}</option>
            <option value="male">{t("gender.male")}</option>
            <option value="female">{t("gender.female")}</option>
            <option value="other">{t("gender.otherOption")}</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="students.empty" />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label={t("students.title")} className="min-w-[900px]">
                <Table.Header>
                  <Table.Column isRowHeader>{t("students.admissionNo")}</Table.Column>
                  <Table.Column>{t("common.name")}</Table.Column>
                  <Table.Column>{t("common.gender")}</Table.Column>
                  <Table.Column>{t("students.field.dateOfBirth")}</Table.Column>
                  <Table.Column>{t("common.status")}</Table.Column>
                  {can("fee.create") ? (
                    <Table.Column>{t("common.actions")}</Table.Column>
                  ) : null}
                </Table.Header>
                <Table.Body>
                  {items.map((student) => (
                    <Table.Row key={student.id} id={student.id}>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {student.admission_no}
                      </Table.Cell>
                      <Table.Cell className="font-medium text-foreground">
                        <Link
                          href={`/dashboard/students/${student.id}`}
                          className="hover:underline"
                        >
                          {student.full_name}
                        </Link>
                      </Table.Cell>
                      <Table.Cell className="capitalize text-muted">
                        {student.gender ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(student.date_of_birth)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={student.status} />
                      </Table.Cell>
                      {can("fee.create") ? (
                        <Table.Cell>
                          <FeeVoucherAction
                            student={{
                              id: student.id,
                              full_name: student.full_name,
                              admission_no: student.admission_no,
                            }}
                          />
                        </Table.Cell>
                      ) : null}
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
