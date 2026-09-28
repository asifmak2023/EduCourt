"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiDownload, apiFetch, apiUpload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import {
  STAFF_DOCUMENT_TYPE_OPTIONS,
  STAFF_STATUS_OPTIONS,
} from "@/lib/staffOptions";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { StaffDocument, StaffMember } from "@/lib/types";

export default function StaffDetailPage() {
  return (
    <PermissionGate permission="hr.view">
      <StaffDetailView />
    </PermissionGate>
  );
}

function StaffDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error, reload } = useResource<StaffMember>(
    id ? `/v1/staff/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Staff member not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.full_name}
        description={`${data.employee_no} · ${
          data.designation?.name ?? "No designation"
        }`}
        actions={
          <>
            <Link
              href="/dashboard/hr/staff"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("hr.edit") ? (
              <Link
                href={`/dashboard/hr/staff/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status ?? "unknown"} />
        {data.employment_type ? (
          <Badge value={data.employment_type} />
        ) : null}
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem label="Employee no" value={data.employee_no} />
          <DataItem label="Department" value={data.department?.name ?? "-"} />
          <DataItem label="Designation" value={data.designation?.name ?? "-"} />
          <DataItem
            label="Employment"
            value={data.employment_type_label ?? data.employment_type ?? "-"}
          />
          <DataItem label="Joining date" value={data.joining_date ?? "-"} />
          <DataItem label="Leaving date" value={data.leaving_date ?? "-"} />
          <DataItem label="Gender" value={data.gender ?? "-"} />
          <DataItem label="Date of birth" value={data.date_of_birth ?? "-"} />
          <DataItem label="CNIC" value={data.cnic ?? "-"} />
          <DataItem label="Phone" value={data.phone ?? "-"} />
          <DataItem label="Email" value={data.email ?? "-"} />
          <DataItem label="Bank" value={data.bank_name ?? "-"} />
          <DataItem
            label="Bank account"
            value={data.bank_account_no ?? "-"}
          />
          <DataItem label="Tax number" value={data.tax_number ?? "-"} />
          <DataItem
            label="Emergency contact"
            value={
              data.emergency_contact_name
                ? `${data.emergency_contact_name}${
                    data.emergency_contact_phone
                      ? ` (${data.emergency_contact_phone})`
                      : ""
                  }`
                : "-"
            }
          />
          <DataItem label="Address" value={data.address ?? "-"} />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      <DocumentsSection
        staffId={data.id}
        documents={data.documents ?? []}
        canCreate={can("hr.create")}
        canApprove={can("hr.approve")}
        canDelete={can("hr.delete")}
        onChanged={reload}
      />

      {can("hr.approve") && data.status !== "resigned" && data.status !== "terminated" ? (
        <TerminateAction id={data.id} onChanged={reload} />
      ) : null}

      {can("hr.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function DocumentsSection({
  staffId,
  documents,
  canCreate,
  canApprove,
  canDelete,
  onChanged,
}: {
  staffId: number;
  documents: StaffDocument[];
  canCreate: boolean;
  canApprove: boolean;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const download = async (document: StaffDocument) => {
    setError(null);

    try {
      const blob = await apiDownload(
        `/v1/staff/${staffId}/documents/${document.id}/download`
      );
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.original_name ?? "document";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to download.");
    }
  };

  const verify = async (document: StaffDocument) => {
    setError(null);

    try {
      await apiFetch(
        `/v1/staff/${staffId}/documents/${document.id}/verify`,
        { method: "POST" }
      );
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to verify.");
    }
  };

  const remove = async (document: StaffDocument) => {
    setError(null);

    try {
      await apiFetch(`/v1/staff/${staffId}/documents/${document.id}`, {
        method: "DELETE",
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
    }
  };

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Documents ({documents.length})
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Contracts, qualifications and identity records.
        </p>
      </div>

      {error ? (
        <div className="px-5 pt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="p-6">
          <EmptyState message="No documents uploaded yet." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Issued</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-900">
                    {document.title ?? document.original_name ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {document.type_label ?? document.type ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {document.issued_on ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {document.expires_on ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      value={document.is_verified ? "verified" : "pending"}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-3 text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => void download(document)}
                        className="text-slate-900 hover:underline"
                      >
                        Download
                      </button>
                      {canApprove && !document.is_verified ? (
                        <button
                          type="button"
                          onClick={() => void verify(document)}
                          className="text-emerald-700 hover:underline"
                        >
                          Verify
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void remove(document)}
                          className="text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canCreate ? (
        <UploadDocumentForm staffId={staffId} onUploaded={onChanged} />
      ) : null}
    </Card>
  );
}

function UploadDocumentForm({
  staffId,
  onUploaded,
}: {
  staffId: number;
  onUploaded: () => void;
}) {
  const [type, setType] = useState("contract");
  const [title, setTitle] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const upload = async () => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setDone(false);

    const formData = new FormData();
    formData.append("type", type);
    if (title) formData.append("title", title);
    if (issuedOn) formData.append("issued_on", issuedOn);
    if (expiresOn) formData.append("expires_on", expiresOn);
    if (notes) formData.append("notes", notes);
    formData.append("file", file);

    try {
      await apiUpload(`/v1/staff/${staffId}/documents`, formData);
      setTitle("");
      setIssuedOn("");
      setExpiresOn("");
      setNotes("");
      setFile(null);
      setDone(true);
      onUploaded();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to upload.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Upload document
      </h3>
      {done ? (
        <div className="mt-3">
          <SuccessNotice message="Document uploaded." />
        </div>
      ) : null}
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Type" htmlFor="doc_type" required>
          <Select
            id="doc_type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {STAFF_DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="doc_title">
          <TextInput
            id="doc_title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="File" htmlFor="doc_file" required>
          <input
            id="doc_file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600"
          />
        </Field>
        <Field label="Issued on" htmlFor="doc_issued">
          <TextInput
            id="doc_issued"
            type="date"
            value={issuedOn}
            onChange={(event) => setIssuedOn(event.target.value)}
          />
        </Field>
        <Field label="Expires on" htmlFor="doc_expires">
          <TextInput
            id="doc_expires"
            type="date"
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
          />
        </Field>
        <Field label="Notes" htmlFor="doc_notes">
          <TextInput
            id="doc_notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
      {error ? (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-3 flex justify-end">
        <Button type="button" loading={busy} disabled={!file} onClick={upload}>
          Upload
        </Button>
      </div>
    </div>
  );
}

function TerminateAction({
  id,
  onChanged,
}: {
  id: number;
  onChanged: () => void;
}) {
  const [leavingDate, setLeavingDate] = useState("");
  const [status, setStatus] = useState("resigned");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const terminate = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/staff/${id}/terminate`, {
        method: "POST",
        body: {
          leaving_date: leavingDate,
          status,
          ...(reason ? { reason } : {}),
        },
      });
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to terminate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">Offboarding</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Record a leaving date and final status.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Leaving date" htmlFor="staff_leaving" required>
          <TextInput
            id="staff_leaving"
            type="date"
            value={leavingDate}
            onChange={(event) => setLeavingDate(event.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="staff_status" required>
          <Select
            id="staff_status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STAFF_STATUS_OPTIONS.filter((option) =>
              ["resigned", "terminated", "retired"].includes(option.value)
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason" htmlFor="staff_reason">
          <TextInput
            id="staff_reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          variant="danger"
          type="button"
          loading={busy}
          disabled={!leavingDate}
          onClick={terminate}
        >
          Record offboarding
        </Button>
      </div>
    </Card>
  );
}

function DeleteAction({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/v1/staff/${id}`, { method: "DELETE" });
      router.push("/dashboard/hr/staff");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Remove</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Archive this staff record.
          </p>
        </div>
        <Button variant="danger" type="button" loading={busy} onClick={remove}>
          Delete
        </Button>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}
