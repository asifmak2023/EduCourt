"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { useAcademicOptions } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { ApiError, apiFetch } from "@/lib/api";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatDate, humanize } from "@/lib/format";
import type { AdmissionDetail } from "@/lib/types";

export default function AdmissionDetailPage() {
  return (
    <PermissionGate permission="admission.view">
      <AdmissionDetailView />
    </PermissionGate>
  );
}

function AdmissionDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();

  const { data, loading, error, reload } = useResource<AdmissionDetail>(
    id ? `/v1/admissions/${id}` : null
  );
  const [enrolledStudentId, setEnrolledStudentId] = useState<number | null>(null);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Application not found." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.full_name}
        description={`Application no ${data.application_no}`}
        actions={
          <>
            <Link
              href="/dashboard/admissions"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("admission.edit") && data.status !== "enrolled" ? (
              <Link
                href={`/dashboard/admissions/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.status} />
        {data.gender ? <Badge value={data.gender} /> : null}
      </div>

      {enrolledStudentId ? (
        <SuccessNotice
          message={`Enrolled successfully. Student record #${enrolledStudentId} created.`}
        />
      ) : null}

      {data.status === "enrolled" && data.student_id ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                ✓ This applicant has been enrolled as a student
              </p>
              <p className="mt-1 text-xs text-muted">
                The student record was created when this admission was enrolled.
                To change the assigned class, section, or roll number — open the
                student record and use the <strong>Enrollments</strong> section there.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/students/${data.student_id}`}
                className={buttonClasses("primary")}
              >
                Open student record →
              </Link>
              <FeeVoucherAction
                student={{ id: data.student_id, full_name: data.full_name }}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <SectionCard title="Applicant">
        <DataList>
          <DataItem label="Date of birth" value={formatDate(data.date_of_birth)} />
          <DataItem label="Gender" value={humanize(data.gender)} />
          <DataItem label="Applied on" value={formatDate(data.applied_on)} />
          <DataItem label="Requested class" value={data.class_room} />
          <DataItem label="Academic year" value={data.academic_year} />
          <DataItem label="Previous school" value={data.previous_school} />
          <DataItem label="City" value={data.city} />
          <DataItem label="Address" value={data.address} />
          <DataItem label="Notes" value={data.notes} />
        </DataList>
      </SectionCard>

      <SectionCard title="Guardian">
        <DataList>
          <DataItem label="Name" value={data.guardian_name} />
          <DataItem label="Phone" value={data.guardian_phone} />
          <DataItem label="Email" value={data.guardian_email} />
          <DataItem label="Relation" value={humanize(data.guardian_relation)} />
        </DataList>
      </SectionCard>

      <SectionCard title="Decision">
        <DataList>
          <DataItem label="Status" value={humanize(data.status)} />
          <DataItem label="Decided on" value={formatDate(data.decided_on)} />
          <DataItem label="Decided by" value={data.decided_by} />
          <DataItem
            label="Documents"
            value={`${data.documents_count ?? 0} uploaded`}
          />
          <DataItem label="Rejection reason" value={data.rejection_reason} />
        </DataList>
      </SectionCard>

      <WorkflowActions
        admission={data}
        canEdit={can("admission.edit")}
        canApprove={can("admission.approve")}
        onChanged={(studentId) => {
          if (studentId) {
            setEnrolledStudentId(studentId);
          }
          reload();
        }}
      />

    </div>
  );
}

function WorkflowActions({
  admission,
  canEdit,
  canApprove,
  onChanged,
}: {
  admission: AdmissionDetail;
  canEdit: boolean;
  canApprove: boolean;
  onChanged: (studentId?: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reject" | "enroll" | null>(null);

  const run = async (
    path: string,
    body?: Record<string, unknown>,
    onSuccess?: (payload: unknown) => void
  ) => {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch<unknown>(path, {
        method: "POST",
        body,
      });
      setMode(null);

      if (onSuccess) {
        onSuccess(response);
      } else {
        onChanged();
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const isEnrolled = admission.status === "enrolled";
  const canSubmit =
    canEdit &&
    (admission.status === "enquiry" || admission.status === "applied");
  const canApproveAction =
    canApprove &&
    !isEnrolled &&
    admission.status !== "rejected";
  const canEnroll =
    canApprove && admission.status === "approved";

  // Nothing to show for enrolled admissions — the banner above handles it.
  if (isEnrolled) {
    return null;
  }

  if (!canEdit && !canApprove) {
    return null;
  }

  // Determine what status the admission is at so we can guide the user.
  const statusGuide: Record<string, string> = {
    enquiry: 'Click "Submit for review" to move this application forward.',
    applied: 'Click "Submit for review" to move this application forward.',
    under_review: 'Review the application, then click "Approve" or "Reject".',
    approved: 'Application is approved. Click "Enroll" to create the student record.',
    rejected: 'This application was rejected. No further action is available.',
  };
  const guide = statusGuide[admission.status ?? ""] ?? null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Workflow</h2>
          {guide ? (
            <p className="mt-0.5 text-xs text-muted">{guide}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSubmit ? (
            <Button
              variant="secondary"
              type="button"
              loading={busy}
              onClick={() =>
                void run(`/v1/admissions/${admission.id}/submit`)
              }
            >
              Submit for review
            </Button>
          ) : null}
          {canApproveAction ? (
            <Button
              type="button"
              loading={busy}
              onClick={() =>
                void run(`/v1/admissions/${admission.id}/approve`)
              }
            >
              Approve
            </Button>
          ) : null}
          {canApproveAction ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => setMode("reject")}
            >
              Reject
            </Button>
          ) : null}
          {canEnroll ? (
            <Button
              type="button"
              loading={busy}
              onClick={() => setMode("enroll")}
            >
              Enroll student
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}

      {mode === "reject" ? (
        <RejectForm
          busy={busy}
          onCancel={() => setMode(null)}
          onConfirm={(reason) =>
            run(`/v1/admissions/${admission.id}/reject`, {
              rejection_reason: reason,
            })
          }
        />
      ) : null}

      {mode === "enroll" ? (
        <EnrollForm
          admission={admission}
          busy={busy}
          onCancel={() => setMode(null)}
          onConfirm={(payload) =>
            run(`/v1/admissions/${admission.id}/enroll`, payload, (response) => {
              const carried = (response as { student?: { id: number } }).student;
              onChanged(carried?.id);
            })
          }
        />
      ) : null}
    </Card>
  );
}

function RejectForm({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <Field label="Rejection reason" htmlFor="rejection_reason" required>
        <TextArea
          id="rejection_reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          variant="danger"
          type="button"
          disabled={reason.trim() === ""}
          loading={busy}
          onClick={() => onConfirm(reason)}
        >
          Confirm rejection
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EnrollForm({
  admission,
  busy,
  onCancel,
  onConfirm,
}: {
  admission: AdmissionDetail;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (payload: Record<string, unknown>) => void;
}) {
  const { options, loading } = useAcademicOptions();

  const [academicYearId, setAcademicYearId] = useState(
    admission.academic_year_id ? String(admission.academic_year_id) : ""
  );
  const [classRoomId, setClassRoomId] = useState(
    admission.class_room_id ? String(admission.class_room_id) : ""
  );
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [startsOn, setStartsOn] = useState("");

  const sections = options.sections.filter(
    (section) => String(section.class_room_id) === classRoomId
  );

  const submit = () => {
    const payload: Record<string, unknown> = {
      academic_year_id: Number(academicYearId),
      class_room_id: Number(classRoomId),
    };

    if (sectionId) {
      payload.section_id = Number(sectionId);
    }
    if (rollNumber) {
      payload.roll_number = rollNumber;
    }
    if (admissionNo) {
      payload.admission_no = admissionNo;
    }
    if (startsOn) {
      payload.starts_on = startsOn;
    }

    onConfirm(payload);
  };

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Academic year" htmlFor="enroll_year" required>
            <Select
              id="enroll_year"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value="">Select year</option>
              {options.academic_years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="enroll_class" required>
            <Select
              id="enroll_class"
              value={classRoomId}
              onChange={(event) => {
                setClassRoomId(event.target.value);
                setSectionId("");
              }}
            >
              <option value="">Select class</option>
              {options.class_rooms.map((classRoom) => (
                <option key={classRoom.id} value={classRoom.id}>
                  {classRoom.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" htmlFor="enroll_section">
            <Select
              id="enroll_section"
              value={sectionId}
              disabled={classRoomId === ""}
              onChange={(event) => setSectionId(event.target.value)}
            >
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Roll number" htmlFor="enroll_roll">
            <TextInput
              id="enroll_roll"
              value={rollNumber}
              onChange={(event) => setRollNumber(event.target.value)}
            />
          </Field>
          <Field
            label="Admission no"
            htmlFor="enroll_admission_no"
            hint="Blank to auto-generate."
          >
            <TextInput
              id="enroll_admission_no"
              value={admissionNo}
              onChange={(event) => setAdmissionNo(event.target.value)}
            />
          </Field>
          <Field label="Starts on" htmlFor="enroll_starts_on">
            <TextInput
              id="enroll_starts_on"
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
            />
          </Field>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={academicYearId === "" || classRoomId === ""}
          loading={busy}
          onClick={submit}
        >
          Create student and enroll
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
