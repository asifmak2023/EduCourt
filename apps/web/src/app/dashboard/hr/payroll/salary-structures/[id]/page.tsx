"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Checkbox, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import { SALARY_INCREMENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
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
import { formatCurrency } from "@/lib/format";
import type {
  SalaryStructure,
  SalaryStructureApplyPreview,
  StaffSalary,
} from "@/lib/types";

export default function SalaryStructureDetailPage() {
  return (
    <PermissionGate permission="payroll.view">
      <StructureDetailView />
    </PermissionGate>
  );
}

function StructureDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { can } = useAuth();
  const { data, loading, error } = useResource<SalaryStructure>(
    id ? `/v1/salary-structures/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Salary structure not found." />;

  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.designation?.name ?? "Designation"} - basic ${formatCurrency(
          Number(data.basic_salary)
        )} ${data.currency}`}
        actions={
          <>
            <Link
              href="/dashboard/hr/payroll/salary-structures"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            {can("payroll.edit") ? (
              <Link
                href={`/dashboard/hr/payroll/salary-structures/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge value={data.is_active ? "active" : "inactive"} />
        <span className="text-xs text-muted">Version {data.version}</span>
        {data.is_current ? (
          <Badge value="current" />
        ) : (
          <Badge value="superseded" />
        )}
      </div>

      <Card className="p-6">
        <DataList>
          <DataItem
            label="Designation"
            value={data.designation?.name ?? `#${data.designation_id}`}
          />
          <DataItem
            label="Basic salary"
            value={formatCurrency(Number(data.basic_salary))}
          />
          <DataItem label="Currency" value={data.currency} />
          <DataItem label="Version" value={String(data.version)} />
          <DataItem label="Effective from" value={data.effective_from ?? "-"} />
          <DataItem label="Effective to" value={data.effective_to ?? "-"} />
          <DataItem
            label="Increment policy"
            value={
              data.increment_type
                ? `${data.increment_type_label ?? data.increment_type} ${
                    data.increment_value ?? ""
                  }${data.increment_type === "percent" ? "%" : ""}`
                : "-"
            }
          />
          <DataItem
            label="Increment cadence"
            value={
              data.increment_every_months
                ? `Every ${data.increment_every_months} month(s)`
                : "-"
            }
          />
        </DataList>
        {data.notes ? (
          <p className="mt-5 border-t border-border-secondary pt-4 text-sm text-muted">
            Notes: {data.notes}
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Component lines ({items.length})
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No component lines." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Salary structure component lines">
                <Table.Header>
                  <Table.Column isRowHeader>Component</Table.Column>
                  <Table.Column>Type</Table.Column>
                  <Table.Column className="text-right">Amount</Table.Column>
                  <Table.Column className="text-right">Percentage</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((item) => (
                    <Table.Row key={item.id} id={item.id}>
                      <Table.Cell className="text-foreground">
                        {item.component?.name ?? `#${item.salary_component_id}`}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {item.component?.type_label ??
                          item.component?.type ??
                          "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {item.amount ? formatCurrency(Number(item.amount)) : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {item.percentage ? `${item.percentage}%` : "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>

      {can("payroll.edit") && data.is_current ? (
        <ReviseCard id={data.id} />
      ) : null}
      {can("payroll.edit") ? <ApplyCard id={data.id} /> : null}
      <AppliedStaffSection id={data.id} />
      <VersionHistory
        designationId={data.designation_id}
        currentId={data.id}
      />
      {can("payroll.delete") ? <DeleteAction id={data.id} /> : null}
    </div>
  );
}

function AppliedStaffSection({ id }: { id: number }) {
  const { data, loading, error } = useResource<StaffSalary[]>(
    `/v1/staff-salaries?salary_structure_id=${id}&per_page=200`
  );

  const salaries = data ?? [];

  return (
    <Card>
      <div className="border-b border-border-secondary px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Applied staff ({salaries.length})
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Staff salaries created from this structure. Open a row to view or give
          an increment.
        </p>
      </div>
      {loading ? (
        <div className="p-6">
          <Spinner />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorNotice message={error} />
        </div>
      ) : salaries.length === 0 ? (
        <div className="p-6">
          <EmptyState message="Not applied to any staff member yet." />
        </div>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Staff salaries from this structure">
              <Table.Header>
                <Table.Column isRowHeader>Staff</Table.Column>
                <Table.Column>Employee no.</Table.Column>
                <Table.Column className="text-right">Basic</Table.Column>
                <Table.Column>Effective from</Table.Column>
                <Table.Column>Effective to</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body>
                {salaries.map((salary) => (
                  <Table.Row key={salary.id} id={salary.id}>
                    <Table.Cell className="font-medium text-foreground">
                      {salary.staff_member?.full_name ??
                        `Staff #${salary.staff_member_id}`}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {salary.staff_member?.employee_no ?? "-"}
                    </Table.Cell>
                    <Table.Cell className="text-right text-muted">
                      {formatCurrency(Number(salary.basic_salary))}{" "}
                      {salary.currency}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {salary.effective_from ?? "-"}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {salary.effective_to ?? "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge value={salary.is_active ? "active" : "inactive"} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Link
                        href={`/dashboard/hr/payroll/salaries/${salary.id}`}
                        className={buttonClasses("secondary")}
                      >
                        View
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </Card>
  );
}

function ReviseCard({ id }: { id: number }) {
  const router = useRouter();
  const [incrementType, setIncrementType] = useState("percent");
  const [incrementValue, setIncrementValue] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revise = async () => {
    setBusy(true);
    setError(null);

    try {
      const created = await apiFetch<{ data: SalaryStructure }>(
        `/v1/salary-structures/${id}/revise`,
        {
          method: "POST",
          body: {
            increment_type: incrementType,
            increment_value: Number(incrementValue),
            ...(effectiveFrom ? { effective_from: effectiveFrom } : {}),
          },
        }
      );

      router.push(
        `/dashboard/hr/payroll/salary-structures/${created.data.id}`
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to revise.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Create revised version
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Supersedes this version with a new one carrying the incremented basic
            salary. Component lines are copied from the current version.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Type" htmlFor="revise_type">
            <Select
              id="revise_type"
              value={incrementType}
              onChange={(event) => setIncrementType(event.target.value)}
            >
              {SALARY_INCREMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Value" htmlFor="revise_value">
            <TextInput
              id="revise_value"
              type="number"
              min="0"
              step="0.01"
              value={incrementValue}
              onChange={(event) => setIncrementValue(event.target.value)}
            />
          </Field>
          <Field label="Effective from" htmlFor="revise_from">
            <TextInput
              id="revise_from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            loading={busy}
            disabled={incrementValue === ""}
            onClick={() => void revise()}
          >
            Revise
          </Button>
        </div>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
    </Card>
  );
}

function VersionHistory({
  designationId,
  currentId,
}: {
  designationId: number;
  currentId: number;
}) {
  const { data, loading, error } = useResource<SalaryStructure[]>(
    `/v1/salary-structures?designation_id=${designationId}&include_history=1`
  );

  return (
    <Card>
      <div className="border-b border-border-secondary px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Version history
        </h2>
      </div>
      {loading ? (
        <div className="p-6">
          <Spinner />
        </div>
      ) : error ? (
        <div className="p-6">
          <ErrorNotice message={error} />
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="p-6">
          <EmptyState message="No versions." />
        </div>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Salary structure versions">
              <Table.Header>
                <Table.Column isRowHeader>Version</Table.Column>
                <Table.Column>Basic salary</Table.Column>
                <Table.Column>Effective from</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body>
                {(data ?? []).map((version) => (
                  <Table.Row key={version.id} id={version.id}>
                    <Table.Cell className="text-foreground">
                      v{version.version}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {formatCurrency(Number(version.basic_salary))}{" "}
                      {version.currency}
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {version.effective_from ?? "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        value={version.is_current ? "current" : "superseded"}
                      />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      {version.id === currentId ? (
                        <span className="text-xs text-muted">Viewing</span>
                      ) : (
                        <Link
                          href={`/dashboard/hr/payroll/salary-structures/${version.id}`}
                          className={buttonClasses("secondary")}
                        >
                          View
                        </Link>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </Card>
  );
}

function ApplyCard({ id }: { id: number }) {
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewPath = `/v1/salary-structures/${id}/apply-preview${
    effectiveFrom ? `?effective_from=${effectiveFrom}` : ""
  }`;
  const {
    data: preview,
    loading: previewLoading,
    error: previewError,
    reload: reloadPreview,
  } = useResource<SalaryStructureApplyPreview>(previewPath);

  const needsConfirmation = Boolean(preview?.requires_confirmation);

  const apply = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch<{
        data: { staff_count: number };
      }>(`/v1/salary-structures/${id}/apply`, {
        method: "POST",
        body: effectiveFrom ? { effective_from: effectiveFrom } : {},
      });

      setMessage(
        `Applied to ${response.data.staff_count} staff member(s).`
      );
      setAcknowledged(false);
      reloadPreview();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to apply.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Apply to staff
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Copies the basic salary and component lines into each staff member
            with this designation. An earlier salary row is closed the day
            before the new effective date.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Effective from" htmlFor="apply_from">
            <TextInput
              id="apply_from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => {
                setEffectiveFrom(event.target.value);
                setAcknowledged(false);
                setMessage(null);
              }}
            />
          </Field>
          <Button
            type="button"
            loading={busy}
            disabled={
              previewLoading ||
              !preview ||
              preview.matched_staff === 0 ||
              (needsConfirmation && !acknowledged)
            }
            onClick={() => void apply()}
          >
            Apply
          </Button>
        </div>
      </div>

      {previewError ? (
        <div className="mt-4">
          <ErrorNotice message={previewError} />
        </div>
      ) : null}

      {preview && !previewError ? (
        <div className="mt-4 space-y-2 rounded-lg border border-border-secondary bg-surface-secondary/40 p-4 text-sm">
          <p className="text-foreground">
            Will apply <strong>{preview.matched_staff}</strong> staff member(s)
            effective <strong>{preview.effective_from}</strong> at{" "}
            <strong>
              {formatCurrency(Number(preview.basic_salary))} {preview.currency}
            </strong>
            .
          </p>
          {preview.matched_staff === 0 ? (
            <p className="text-muted">
              No staff members currently hold this designation, so nothing can
              be applied yet.
            </p>
          ) : null}
          {preview.already_from_this_structure > 0 ? (
            <p className="text-muted">
              {preview.already_from_this_structure} staff member(s) already have
              a salary from this structure.
            </p>
          ) : null}
          {preview.already_on_this_date > 0 ? (
            <p className="text-muted">
              {preview.already_on_this_date} salary row(s) already start on this
              date and will be replaced.
            </p>
          ) : null}
          {preview.will_supersede > 0 ? (
            <p className="text-muted">
              {preview.will_supersede} earlier salary row(s) will be closed the
              day before this date.
            </p>
          ) : null}
          {preview.staff.length > 0 ? (
            <p className="text-muted">
              Staff:{" "}
              {preview.staff
                .map((member) => member.full_name)
                .join(", ")}
              {preview.matched_staff > preview.staff.length
                ? ` and ${preview.matched_staff - preview.staff.length} more`
                : ""}
            </p>
          ) : null}
          {needsConfirmation ? (
            <div className="pt-2">
              <Checkbox
                label="I understand this will update or close existing salary rows."
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4">
          <SuccessNotice message={message} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
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
      await apiFetch(`/v1/salary-structures/${id}`, { method: "DELETE" });
      router.push("/dashboard/hr/payroll/salary-structures");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to delete.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Remove</h2>
          <p className="mt-0.5 text-xs text-muted">
            Archive this salary structure. Staff salaries already applied are
            kept.
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
