"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useClassRooms, useSections } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  StatCard,
  Spinner,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { AttendanceReport } from "@/lib/types";

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceReportPage() {
  return (
    <PermissionGate permission="attendance.view">
      <ReportView />
    </PermissionGate>
  );
}

function ReportView() {
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams({ from, to });
      if (classId) query.set("class_room_id", classId);
      if (sectionId) query.set("section_id", sectionId);

      try {
        const response = await apiFetch<{ data: AttendanceReport }>(
          `/v1/attendance/students/report?${query.toString()}`,
          { signal: controller.signal }
        );
        setReport(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to build report."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [from, to, classId, sectionId]);

  useEffect(() => load(), [load]);

  const filteredSections = sections.filter(
    (section) => !classId || String(section.class_room_id) === classId
  );

  const totals = report?.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance report"
        description="Class summaries and totals for a date range."
        actions={
          <Link
            href="/dashboard/attendance"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From" htmlFor="report_from">
            <TextInput
              id="report_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="report_to">
            <TextInput
              id="report_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field label="Class" htmlFor="report_class">
            <Select
              id="report_class"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setSectionId("");
              }}
            >
              <option value="">All classes</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" htmlFor="report_section">
            <Select
              id="report_section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value="">All sections</option>
              {filteredSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Students marked" value={formatNumber(totals?.total ?? 0)} />
            <StatCard label="Present" value={formatNumber(totals?.present ?? 0)} />
            <StatCard label="Leave" value={formatNumber(totals?.leave ?? 0)} />
            <StatCard label="Absent" value={formatNumber(totals?.absent ?? 0)} />
          </div>

          <Card>
            {report.classes.length === 0 ? (
              <EmptyState message="No attendance was recorded in this period." />
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Attendance report"
                    className="min-w-[880px]"
                  >
                    <Table.Header>
                      <Table.Column isRowHeader>Class</Table.Column>
                      <Table.Column className="text-right">Students</Table.Column>
                      <Table.Column className="text-right">Boys</Table.Column>
                      <Table.Column className="text-right">Girls</Table.Column>
                      <Table.Column className="text-right">Present</Table.Column>
                      <Table.Column className="text-right">Leave</Table.Column>
                      <Table.Column className="text-right">Absent</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {report.classes.map((row) => (
                        <Table.Row
                          key={row.class_room_id ?? "none"}
                          id={row.class_room_id ?? "none"}
                        >
                          <Table.Cell className="font-medium text-foreground">
                            {row.class_room ?? "Unassigned"}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.total)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.boys)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.girls)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.present)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.leave)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.absent)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                    <Table.Footer>
                      <Table.Row id="total">
                        <Table.Cell className="font-medium text-foreground">
                          Total
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.total ?? 0)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.boys ?? 0)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.girls ?? 0)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.present ?? 0)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.leave ?? 0)}
                        </Table.Cell>
                        <Table.Cell className="text-right font-medium text-foreground">
                          {formatNumber(totals?.absent ?? 0)}
                        </Table.Cell>
                      </Table.Row>
                    </Table.Footer>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
