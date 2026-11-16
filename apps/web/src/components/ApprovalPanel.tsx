"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { ApiError, apiFetch } from "@/lib/api";
import { Button, Field, TextArea, TextInput } from "@/components/Form";
import {
  Badge,
  EmptyState,
  ErrorNotice,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  ApprovalRequest,
  ApprovalWorkflowStep,
} from "@/lib/types";
import type { AuthUser } from "@/lib/auth";

function matchesStep(step: ApprovalWorkflowStep, user: AuthUser): boolean {
  if (step.approver_user_id !== null && step.approver_user_id !== user.id) {
    return false;
  }

  if (step.required_role !== null && !user.roles.includes(step.required_role)) {
    return false;
  }

  if (
    step.required_permission !== null &&
    !user.permissions.includes(step.required_permission)
  ) {
    return false;
  }

  return true;
}

export function ApprovalPanel({
  entityType,
  entityId,
  amount,
  canSubmit,
  canApprove,
  canCancel,
  onChanged,
  onStatusChange,
}: {
  entityType: string;
  entityId: number;
  amount: string;
  canSubmit: boolean;
  canApprove: boolean;
  canCancel?: boolean;
  onChanged?: () => void;
  onStatusChange?: (status: string | null) => void;
}) {
  const { user } = useAuth();
  const { data, loading, error, reload } = useResource<ApprovalRequest[]>(
    `/v1/approvals?entity_type=${encodeURIComponent(entityType)}&entity_id=${entityId}&per_page=50`
  );

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mode, setMode] = useState<"submit" | "approve" | "reject" | null>(
    null
  );
  const [submitAmount, setSubmitAmount] = useState(amount);
  const [notes, setNotes] = useState("");
  const [comment, setComment] = useState("");

  const requests = data ?? [];
  const latest = requests[0] ?? null;
  const pending = latest?.status === "pending" ? latest : null;
  const steps = latest?.workflow?.steps ?? [];
  const currentStep = pending
    ? steps.find((step) => step.sequence === pending.current_sequence) ?? null
    : null;
  const canAct =
    canApprove && (currentStep === null || (user ? matchesStep(currentStep, user) : false));

  useEffect(() => {
    if (!loading) {
      onStatusChange?.(latest?.status ?? null);
    }
  }, [latest?.status, loading, onStatusChange]);

  const run = async (
    path: string,
    body: Record<string, unknown> | undefined,
    message: string
  ) => {
    setBusy(true);
    setActionError(null);
    setDone(null);

    try {
      await apiFetch(path, { method: "POST", body });

      setMode(null);
      setNotes("");
      setComment("");
      setDone(message);
      reload();
      onChanged?.();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError ? err.message : "Approval action failed."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading && data === null) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  return (
    <SectionCard
      title="Approval"
      description="Expenses that match an approval workflow must be approved before they can be posted."
      actions={
        pending ? <Badge value={pending.status} /> : latest ? <Badge value={latest.status} /> : null
      }
    >
      {latest === null ? (
        <EmptyState message="No approval requests have been submitted for this expense." />
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Status</dt>
              <dd className="mt-1 text-foreground">
                <Badge value={latest.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Workflow</dt>
              <dd className="mt-1 text-foreground">
                {latest.workflow?.name ?? `#${latest.approval_workflow_id}`}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Amount</dt>
              <dd className="mt-1 text-foreground">{formatCurrency(latest.amount)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Submitted</dt>
              <dd className="mt-1 text-foreground">{formatDate(latest.created_at)}</dd>
            </div>
          </dl>

          {latest.notes ? (
            <p className="rounded-lg border border-border-secondary px-4 py-3 text-sm text-muted">
              {latest.notes}
            </p>
          ) : null}

          {steps.length > 0 ? (
            <ol className="space-y-2">
              {steps.map((step) => {
                const action = latest.actions?.find(
                  (entry) => entry.sequence === step.sequence
                );
                const isCurrent =
                  latest.status === "pending" &&
                  step.sequence === latest.current_sequence;

                return (
                  <li
                    key={step.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-secondary px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {step.sequence}. {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {step.required_role
                          ? `Role: ${step.required_role}`
                          : step.required_permission
                            ? `Permission: ${step.required_permission}`
                            : step.approver_user_id
                              ? `Approver: user #${step.approver_user_id}`
                              : "Any finance approver"}
                      </p>
                      {action?.comment ? (
                        <p className="mt-1 text-xs text-muted">
                          {action.comment}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      value={
                        action?.action ??
                        (isCurrent ? "pending" : "waiting")
                      }
                    />
                  </li>
                );
              })}
            </ol>
          ) : null}

          {latest.status === "approved" ? (
            <p className="text-sm text-success">
              Approval granted. The expense can now be posted from the actions
              section below.
            </p>
          ) : null}

          {latest.status === "rejected" ? (
            <p className="text-sm text-danger">
              This request was rejected. Submit a new request to try again.
            </p>
          ) : null}
        </div>
      )}

      {done ? (
        <div className="mt-4">
          <SuccessNotice message={done} />
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-4">
          <ErrorNotice message={actionError} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-secondary pt-5">
        {canSubmit && pending === null && latest?.status !== "approved" ? (
          <Button type="button" onClick={() => setMode("submit")}>
            {latest ? "Submit new request" : "Submit for approval"}
          </Button>
        ) : null}
        {pending && canAct ? (
          <>
            <Button type="button" onClick={() => setMode("approve")}>
              Approve request
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setMode("reject")}
            >
              Reject request
            </Button>
          </>
        ) : null}
        {pending && canCancel && !canAct ? (
          <Button
            type="button"
            variant="ghost"
            loading={busy}
            onClick={() =>
              void run(
                `/v1/approvals/${pending.id}/cancel`,
                undefined,
                "Approval request cancelled."
              )
            }
          >
            Cancel request
          </Button>
        ) : null}
      </div>

      {mode === "submit" ? (
        <div className="mt-5 grid gap-4 border-t border-border-secondary pt-5 sm:grid-cols-2">
          <Field
            label="Amount"
            htmlFor="approval_amount"
            required
            hint={`Expense total ${formatCurrency(amount)}`}
          >
            <TextInput
              id="approval_amount"
              type="number"
              step="0.01"
              min="0"
              value={submitAmount}
              onChange={(event) => setSubmitAmount(event.target.value)}
            />
          </Field>
          <Field
            label="Notes"
            htmlFor="approval_notes"
            className="sm:col-span-2"
          >
            <TextArea
              id="approval_notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Button
              type="button"
              disabled={Number(submitAmount) <= 0}
              loading={busy}
              onClick={() =>
                void run(
                  "/v1/approvals",
                  {
                    entity_type: entityType,
                    entity_id: entityId,
                    amount: Number(submitAmount),
                    ...(notes ? { notes } : {}),
                  },
                  "Approval request submitted."
                )
              }
            >
              Submit request
            </Button>
            <Button variant="ghost" type="button" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "approve" || mode === "reject" ? (
        <div className="mt-5 space-y-4 border-t border-border-secondary pt-5">
          <Field
            label={mode === "approve" ? "Approval comment" : "Rejection reason"}
            htmlFor="approval_comment"
          >
            <TextArea
              id="approval_comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={mode === "reject" ? "danger" : "primary"}
              loading={busy}
              onClick={() =>
                void run(
                  `/v1/approvals/${pending?.id}/${mode}`,
                  comment ? { comment } : undefined,
                  mode === "approve"
                    ? "Approval step recorded."
                    : "Approval request rejected."
                )
              }
            >
              {mode === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
