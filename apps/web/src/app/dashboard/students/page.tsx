"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Button, Select, TextInput, buttonClasses } from "@/components/Form";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
import { CollectPaymentButton } from "@/components/fee-counter/CollectPaymentButton";
import { BulkFeeVoucherDialog } from "@/components/fee-counter/BulkFeeVoucherDialog";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useAcademicYears, useClassRooms, useSections } from "@/lib/useLookups";
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
  const { can, canAny } = useAuth();
  const { t } = useTranslation();

  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: allSections } = useSections();

  const filteredSections = useMemo(
    () =>
      allSections.filter(
        (s) => !classId || String(s.class_room_id) === classId
      ),
    [allSections, classId]
  );

  const params: Record<string, string | number> = {};
  if (status) params.status = status;
  if (gender) params.gender = gender;
  if (academicYearId) params.academic_year_id = academicYearId;
  if (classId) params.class_room_id = classId;
  if (sectionId) params.section_id = sectionId;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Student>("/v1/students", params);

  const handleClassChange = (value: string) => {
    setClassId(value);
    setSectionId("");
    setPage(1);
  };

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
            {canAny(AR_VIEW) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setBulkOpen(true)}
              >
                Generate for class
              </Button>
            ) : null}
          </>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status */}
        <div className="w-44">
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

        {/* Gender */}
        <div className="w-44">
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

        {/* Academic year */}
        <div className="w-44">
          <Select
            value={academicYearId}
            onChange={(event) => {
              setPage(1);
              setAcademicYearId(event.target.value);
            }}
          >
            <option value="">All years</option>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Class */}
        <div className="w-44">
          <Select
            value={classId}
            onChange={(event) => handleClassChange(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Section — only meaningful once a class is selected */}
        <div className="w-44">
          <Select
            value={sectionId}
            onChange={(event) => {
              setPage(1);
              setSectionId(event.target.value);
            }}
            disabled={!classId}
          >
            <option value="">All sections</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
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
                  {canAny(AR_VIEW) ? (
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
                      {canAny(AR_VIEW) ? (
                        <Table.Cell>
                          <div className="flex flex-wrap gap-2">
                            <CollectPaymentButton
                              student={{
                                id: student.id,
                                full_name: student.full_name,
                                admission_no: student.admission_no,
                              }}
                              label="Collect"
                            />
                            <FeeVoucherAction
                              student={{
                                id: student.id,
                                full_name: student.full_name,
                                admission_no: student.admission_no,
                              }}
                            />
                          </div>
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

      <BulkFeeVoucherDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
