"use client";

import { useState } from "react";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { ActivityLog, AuditLogFilters } from "@/lib/types";

export default function AuditLogPage() {
  return (
    <PermissionGate permission="audit.view">
      <AuditLogView />
    </PermissionGate>
  );
}

function AuditLogView() {
  const [logName, setLogName] = useState("");
  const [event, setEvent] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: filterData } = useResource<AuditLogFilters>(
    "/v1/audit-logs/filters"
  );

  const params: Record<string, string | number> = {};
  if (logName) params.log_name = logName;
  if (event) params.event = event;
  if (from) params.from = from;
  if (to) params.to = to;

  const { items, meta, loading, error, page, setPage, search, setSearch } =
    useList<ActivityLog>("/v1/audit-logs", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Who changed what, across the platform or your campus."
      />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search" htmlFor="audit_search">
            <TextInput
              id="audit_search"
              value={search}
              placeholder="Description or log name"
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
            />
          </Field>
          <Field label="Log name" htmlFor="audit_log_name">
            <Select
              id="audit_log_name"
              value={logName}
              onChange={(changeEvent) => {
                setPage(1);
                setLogName(changeEvent.target.value);
              }}
            >
              <option value="">All log names</option>
              {(filterData?.log_names ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Event" htmlFor="audit_event">
            <Select
              id="audit_event"
              value={event}
              onChange={(changeEvent) => {
                setPage(1);
                setEvent(changeEvent.target.value);
              }}
            >
              <option value="">All events</option>
              {(filterData?.events ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="audit_from">
              <TextInput
                id="audit_from"
                type="date"
                value={from}
                onChange={(changeEvent) => {
                  setPage(1);
                  setFrom(changeEvent.target.value);
                }}
              />
            </Field>
            <Field label="To" htmlFor="audit_to">
              <TextInput
                id="audit_to"
                type="date"
                value={to}
                onChange={(changeEvent) => {
                  setPage(1);
                  setTo(changeEvent.target.value);
                }}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        {error ? (
          <div className="p-5">
            <ErrorNotice message={error} />
          </div>
        ) : loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No activity matches these filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Causer</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {entry.event ? (
                        <Badge value={entry.event} />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{entry.description}</p>
                      <p className="text-xs text-slate-400">
                        {entry.log_name ?? "-"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {entry.causer_name ??
                        (entry.causer_id ? `User #${entry.causer_id}` : "-")}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {entry.subject_type
                        ? `${entry.subject_type}${
                            entry.subject_id ? ` #${entry.subject_id}` : ""
                          }`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.last_page > 1 ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination
              page={page}
              lastPage={meta.last_page}
              total={meta.total}
              onPage={setPage}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
