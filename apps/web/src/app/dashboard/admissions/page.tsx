"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useAuth } from "@/lib/auth";
import { useAcademicYearDefault } from "@/lib/academicYear";
import { useAcademicYears, useClassRooms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
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
import { formatDate } from "@/lib/format";
import type { Admission } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "enquiry", label: "Enquiry" },
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "enrolled", label: "Enrolled" },
];

export default function AdmissionsPage() {
  return (
    <PermissionGate permission="admission.view">
      <AdmissionsTable />
    </PermissionGate>
  );
}

function AdmissionsTable() {
  const { can } = useAuth();

  const [status, setStatus] = useState("");
  const [classRoomId, setClassRoomId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [gender, setGender] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  useAcademicYearDefault(years, academicYearId, setAcademicYearId);

  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (classRoomId) params.class_room_id = classRoomId;
  if (academicYearId) params.academic_year_id = academicYearId;
  if (gender) params.gender = gender;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<Admission>("/v1/admissions", params);

  const activeFilterCount = [status, classRoomId, academicYearId, gender, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setStatus("");
    setClassRoomId("");
    setAcademicYearId("");
    setGender("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Applications and their current stage."
        actions={
          <>
            <div className="w-full sm:w-64">
              <TextInput
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search name, application no or phone"
              />
            </div>
            {can("admission.create") ? (
              <Link
                href="/dashboard/admissions/new"
                className={buttonClasses("primary")}
              >
                New application
              </Link>
            ) : null}
          </>
        }
      />

      {/* Filter bar */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        {/* Status */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-muted">Status</label>
          <Select
            value={status}
            onChange={(event) => { setPage(1); setStatus(event.target.value); }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        {/* Academic year */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-muted">Academic year</label>
          <Select
            value={academicYearId}
            onChange={(event) => { setPage(1); setAcademicYearId(event.target.value); }}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </div>

        {/* Class */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-muted">Requested class</label>
          <Select
            value={classRoomId}
            onChange={(event) => { setPage(1); setClassRoomId(event.target.value); }}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        {/* Gender */}
        <div className="w-full sm:w-36">
          <label className="mb-1 block text-xs font-medium text-muted">Gender</label>
          <Select
            value={gender}
            onChange={(event) => { setPage(1); setGender(event.target.value); }}
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>

        {/* Applied from */}
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-muted">Applied from</label>
          <TextInput
            type="date"
            value={dateFrom}
            onChange={(event) => { setPage(1); setDateFrom(event.target.value); }}
          />
        </div>

        {/* Applied to */}
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-muted">Applied to</label>
          <TextInput
            type="date"
            value={dateTo}
            onChange={(event) => { setPage(1); setDateTo(event.target.value); }}
          />
        </div>

        {/* Clear */}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mb-0.5 self-end text-xs text-muted underline hover:text-foreground"
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
          <EmptyState message="No applications match your filters." />
        ) : (
          <>
            <ul className="divide-y divide-border-secondary md:hidden">
              {items.map((admission) => (
                <li key={admission.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/admissions/${admission.id}`}
                        className="text-sm font-semibold text-foreground hover:underline"
                      >
                        {admission.full_name}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {admission.application_no}
                      </p>
                    </div>
                    <Badge value={admission.status} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Class requested
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {admission.class_room ?? "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Applied
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {formatDate(admission.applied_on)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Guardian phone
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {admission.guardian_phone ?? "-"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Admissions" className="min-w-[1000px]">
                    <Table.Header>
                      <Table.Column isRowHeader>Application no</Table.Column>
                      <Table.Column>Applicant</Table.Column>
                      <Table.Column>Gender</Table.Column>
                      <Table.Column>Class requested</Table.Column>
                      <Table.Column>Academic year</Table.Column>
                      <Table.Column>Guardian phone</Table.Column>
                      <Table.Column>Applied</Table.Column>
                      <Table.Column>Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {items.map((admission) => (
                        <Table.Row key={admission.id} id={admission.id}>
                          <Table.Cell className="font-mono text-xs text-muted">
                            {admission.application_no}
                          </Table.Cell>
                          <Table.Cell className="font-medium text-foreground">
                            <Link
                              href={`/dashboard/admissions/${admission.id}`}
                              className="hover:underline"
                            >
                              {admission.full_name}
                            </Link>
                          </Table.Cell>
                          <Table.Cell className="capitalize text-muted">
                            {admission.gender ?? "-"}
                          </Table.Cell>
                          <Table.Cell className="text-muted">
                            {admission.class_room ?? "-"}
                          </Table.Cell>
                          <Table.Cell className="text-muted">
                            {admission.academic_year ?? "-"}
                          </Table.Cell>
                          <Table.Cell className="text-muted">
                            {admission.guardian_phone ?? "-"}
                          </Table.Cell>
                          <Table.Cell className="text-muted">
                            {formatDate(admission.applied_on)}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge value={admission.status} />
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          </>
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
