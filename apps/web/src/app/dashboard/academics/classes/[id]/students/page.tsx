"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "@heroui/react";
import { useResource } from "@/lib/useResource";
import { useList } from "@/lib/useList";
import { useAcademicYears, useSections } from "@/lib/useLookups";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, Button, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { BulkFeeVoucherDialog } from "@/components/fee-counter/BulkFeeVoucherDialog";
import type { ClassRoom, Student } from "@/lib/types";

export default function ClassStudentsPage() {
  return (
    <PermissionGate permission="student.view">
      <ClassStudentsView />
    </PermissionGate>
  );
}

function ClassStudentsView() {
  const params = useParams<{ id: string }>();
  const classId = params?.id ?? "";

  const { data: classRoom, loading: classLoading } = useResource<ClassRoom>(
    classId ? `/v1/classes/${classId}` : null
  );

  const { can } = useAuth();
  const canGenerateVouchers = can("fee_counter.generate");

  const [academicYearId, setAcademicYearId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("active");
  const [gender, setGender] = useState("");

  const { items: years } = useAcademicYears();
  const { items: allSections } = useSections();
  const filteredSections = allSections.filter(
    (s) => String(s.class_room_id) === classId
  );

  const params2: Record<string, string | number> = {
    class_room_id: classId,
  };
  if (academicYearId) params2.academic_year_id = academicYearId;
  if (sectionId) params2.section_id = sectionId;
  if (status) params2.status = status;
  if (gender) params2.gender = gender;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Student>("/v1/students", params2);

  const activeFilterCount = [academicYearId, sectionId, status, gender].filter(Boolean).length;

  const clearFilters = () => {
    setAcademicYearId("");
    setSectionId("");
    setStatus("active");
    setGender("");
    setPage(1);
  };

  const title = classLoading
    ? "Class Roster"
    : classRoom
    ? `${classRoom.name} — Students`
    : "Class Roster";

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAcademicYearId, setBulkAcademicYearId] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="Students enrolled in this class."
        actions={
          <>
            <Link
              href="/dashboard/academics/classes"
              className={buttonClasses("secondary")}
            >
              All classes
            </Link>
            <div className="w-56">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search name or admission no"
              />
            </div>
            {canGenerateVouchers && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setBulkAcademicYearId(academicYearId || "");
                  setBulkSectionId(sectionId || "");
                  setBulkOpen(true);
                }}
              >
                Generate Vouchers
              </Button>
            )}
          </>
        }
      />

      {/* Filters */}
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
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
            <option value="transferred">Transferred</option>
            <option value="withdrawn">Withdrawn</option>
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

        {/* Section */}
        {filteredSections.length > 0 && (
          <div className="w-44">
            <Select
              value={sectionId}
              onChange={(event) => {
                setPage(1);
                setSectionId(event.target.value);
              }}
            >
              <option value="">All sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Gender */}
        <div className="w-36">
          <Select
            value={gender}
            onChange={(event) => {
              setPage(1);
              setGender(event.target.value);
            }}
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>

        {/* Clear filters */}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="self-end text-xs text-muted underline hover:text-foreground"
          >
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        ) : null}
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No students enrolled in this class." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label={title}
                className="min-w-[800px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Admission No</Table.Column>
                  <Table.Column>Name</Table.Column>
                  <Table.Column>Section</Table.Column>
                  <Table.Column>Roll No</Table.Column>
                  <Table.Column>Gender</Table.Column>
                  <Table.Column>Date of Birth</Table.Column>
                  <Table.Column>Student Status</Table.Column>
                  <Table.Column>Enrollment</Table.Column>
                  <Table.Column>Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((student) => {
                    const enrollment =
                      student.enrollments?.find(
                        (e) =>
                          e.status === "active" &&
                          String(e.class_room_id) === classId
                      ) ??
                      student.enrollments?.find(
                        (e) => String(e.class_room_id) === classId
                      ) ??
                      student.enrollments?.[0];

                    return (
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
                        <Table.Cell className="text-muted">
                          {enrollment?.section?.name ?? "-"}
                        </Table.Cell>
                        <Table.Cell className="font-mono text-xs text-muted">
                          {enrollment?.roll_number ?? "-"}
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
                        <Table.Cell>
                          {enrollment ? (
                            <Badge value={enrollment.status} />
                          ) : (
                            <span className="text-xs text-muted">-</span>
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            View / Edit
                          </Link>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
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
        initialClassId={classId}
        initialAcademicYearId={bulkAcademicYearId}
        initialSectionId={bulkSectionId}
      />
    </div>
  );
}
