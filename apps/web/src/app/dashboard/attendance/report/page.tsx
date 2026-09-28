"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Class</th>
                      <th className="px-5 py-3 font-medium text-right">Students</th>
                      <th className="px-5 py-3 font-medium text-right">Boys</th>
                      <th className="px-5 py-3 font-medium text-right">Girls</th>
                      <th className="px-5 py-3 font-medium text-right">Present</th>
                      <th className="px-5 py-3 font-medium text-right">Leave</th>
                      <th className="px-5 py-3 font-medium text-right">Absent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.classes.map((row) => (
                      <tr key={row.class_room_id ?? "none"} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {row.class_room ?? "Unassigned"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.total)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.boys)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.girls)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.present)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.leave)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.absent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-medium text-slate-900">
                    <tr>
                      <td className="px-5 py-3">Total</td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.total ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.boys ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.girls ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.present ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.leave ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatNumber(totals?.absent ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
