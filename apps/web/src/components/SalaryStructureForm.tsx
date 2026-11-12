"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useDesignations, useSalaryComponents } from "@/lib/useLookups";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import { Repeater } from "@/components/Repeater";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import { SALARY_INCREMENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
import type { SalaryStructure } from "@/lib/types";

interface ComponentRow {
  salary_component_id: string;
  amount: string;
  percentage: string;
}

const emptyRow = (): ComponentRow => ({
  salary_component_id: "",
  amount: "",
  percentage: "",
});

function formatMoney(value: number): string {
  return value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SalaryStructureForm({
  salaryStructure,
}: {
  salaryStructure?: SalaryStructure;
}) {
  const router = useRouter();
  const isEdit = Boolean(salaryStructure);

  const {
    items: designations,
    loading: designationsLoading,
    error: designationsError,
  } = useDesignations();
  const {
    items: components,
    loading: componentsLoading,
    error: componentsError,
  } = useSalaryComponents();

  const [designationId, setDesignationId] = useState(
    salaryStructure?.designation_id ? String(salaryStructure.designation_id) : ""
  );
  const [name, setName] = useState(salaryStructure?.name ?? "");
  const [basicSalary, setBasicSalary] = useState(
    salaryStructure?.basic_salary ?? ""
  );
  const [currency, setCurrency] = useState(salaryStructure?.currency ?? "PKR");
  const [effectiveFrom, setEffectiveFrom] = useState(
    salaryStructure?.effective_from ?? ""
  );
  const [effectiveTo, setEffectiveTo] = useState(
    salaryStructure?.effective_to ?? ""
  );
  const [isActive, setIsActive] = useState(salaryStructure?.is_active ?? true);
  const [notes, setNotes] = useState(salaryStructure?.notes ?? "");
  const [incrementType, setIncrementType] = useState(
    salaryStructure?.increment_type ?? ""
  );
  const [incrementValue, setIncrementValue] = useState(
    salaryStructure?.increment_value ?? ""
  );
  const [incrementEveryMonths, setIncrementEveryMonths] = useState(
    salaryStructure?.increment_every_months
      ? String(salaryStructure.increment_every_months)
      : ""
  );

  const [rows, setRows] = useState<ComponentRow[]>(
    salaryStructure?.items && salaryStructure.items.length
      ? salaryStructure.items.map((item) => ({
          salary_component_id: String(item.salary_component_id),
          amount: item.amount ?? "",
          percentage: item.percentage ?? "",
        }))
      : [emptyRow()]
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const componentTotals = useMemo(() => {
    const basic = Number(basicSalary) || 0;
    let earnings = 0;
    let deductions = 0;

    for (const row of rows) {
      if (!row.salary_component_id) continue;

      const component = components.find(
        (entry) => String(entry.id) === row.salary_component_id
      );

      const amount = row.amount
        ? Number(row.amount)
        : row.percentage
          ? (basic * Number(row.percentage)) / 100
          : 0;

      if (component?.type === "deduction") {
        deductions += amount;
      } else {
        earnings += amount;
      }
    }

    const gross = basic + earnings;

    return { gross, deductions, net: gross - deductions };
  }, [rows, components, basicSalary]);

  const updateRow = (index: number, patch: Partial<ComponentRow>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const errText = (field: string) => fieldErrors[field]?.[0] ?? null;

  const selectedDesignation =
    designations.find((entry) => String(entry.id) === designationId)?.name ?? "";
  const resolvedName =
    name.trim() || (selectedDesignation ? `${selectedDesignation} salary` : "");

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        designation_id: Number(designationId),
        name: resolvedName,
        basic_salary: Number(basicSalary),
        currency,
        effective_from: effectiveFrom || null,
        effective_to: effectiveTo || null,
        is_active: isActive,
        increment_type: incrementType || null,
        increment_value: incrementValue === "" ? null : Number(incrementValue),
        increment_every_months:
          incrementEveryMonths === "" ? null : Number(incrementEveryMonths),
        items: rows
          .filter((row) => row.salary_component_id)
          .map((row, index) => ({
            salary_component_id: Number(row.salary_component_id),
            ...(row.amount ? { amount: Number(row.amount) } : {}),
            ...(row.percentage ? { percentage: Number(row.percentage) } : {}),
            sort_order: index,
          })),
      };

      if (notes) {
        body.notes = notes;
      }

      if (isEdit && salaryStructure) {
        await apiFetch(`/v1/salary-structures/${salaryStructure.id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch("/v1/salary-structures", { method: "POST", body });
      }

      router.push("/dashboard/hr/payroll/salary-structures");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save salary structure.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (designationsLoading || componentsLoading) {
    return <Spinner />;
  }

  const invalid = !designationId || !resolvedName || basicSalary === "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isEdit ? `Edit ${salaryStructure?.name}` : "New salary structure"
        }
        description="Reusable salary template for a designation. Apply it to copy the pay into each staff member."
        actions={
          <Link
            href="/dashboard/hr/payroll/salary-structures"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}
      {designationsError ? (
        <ErrorNotice
          message={`Unable to load designations: ${designationsError}`}
        />
      ) : null}
      {!designationsLoading && !designationsError && designations.length === 0 ? (
        <ErrorNotice message="No designations exist for this campus yet. Ask an HR Officer or Campus Admin to add a designation under HR > Designations, then create the salary structure." />
      ) : null}
      {componentsError ? (
        <ErrorNotice
          message={`Unable to load salary components: ${componentsError}`}
        />
      ) : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Designation"
              htmlFor="ss_designation"
              required
              error={errText("designation_id")}
            >
              <Select
                id="ss_designation"
                value={designationId}
                onChange={(event) => setDesignationId(event.target.value)}
              >
                <option value="">Select designation</option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>
                    {designation.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name" htmlFor="ss_name" required error={errText("name")}>
              <TextInput
                id="ss_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={
                  selectedDesignation
                    ? `${selectedDesignation} salary`
                    : "e.g. Senior Teacher salary"
                }
              />
            </Field>
            <Field
              label="Basic salary"
              htmlFor="ss_basic"
              required
              error={errText("basic_salary")}
            >
              <TextInput
                id="ss_basic"
                type="number"
                min="0"
                step="0.01"
                value={basicSalary}
                onChange={(event) => setBasicSalary(event.target.value)}
              />
            </Field>
            <Field label="Currency" htmlFor="ss_currency">
              <TextInput
                id="ss_currency"
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Effective from" htmlFor="ss_from">
              <TextInput
                id="ss_from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </Field>
            <Field label="Effective to" htmlFor="ss_to">
              <TextInput
                id="ss_to"
                type="date"
                value={effectiveTo}
                onChange={(event) => setEffectiveTo(event.target.value)}
              />
            </Field>
            <Field label="Notes" htmlFor="ss_notes">
              <TextInput
                id="ss_notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <Field
              label="Default increment type"
              htmlFor="ss_increment_type"
              hint="Applied when this structure is revised without an explicit amount"
            >
              <Select
                id="ss_increment_type"
                value={incrementType}
                onChange={(event) => setIncrementType(event.target.value)}
              >
                <option value="">None</option>
                {SALARY_INCREMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Increment value" htmlFor="ss_increment_value">
              <TextInput
                id="ss_increment_value"
                type="number"
                min="0"
                step="0.01"
                value={incrementValue}
                onChange={(event) => setIncrementValue(event.target.value)}
              />
            </Field>
            <Field
              label="Increment cadence (months)"
              htmlFor="ss_increment_every_months"
            >
              <TextInput
                id="ss_increment_every_months"
                type="number"
                min="1"
                step="1"
                value={incrementEveryMonths}
                onChange={(event) => setIncrementEveryMonths(event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
            </div>
          </div>

          <div className="border-t border-border-secondary px-6 py-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Component lines
              </h2>
              <p className="text-sm text-muted">
                Gross {formatMoney(componentTotals.gross)} - Deductions{" "}
                {formatMoney(componentTotals.deductions)} - Net{" "}
                {formatMoney(componentTotals.net)}
              </p>
            </div>

            <Repeater<ComponentRow>
              rows={rows}
              onChange={setRows}
              addLabel="Add component"
              emptyRow={emptyRow}
              renderRow={(row, index) => (
                <>
                  <Field label="Component" htmlFor={`ss_item_${index}`}>
                    <Select
                      id={`ss_item_${index}`}
                      value={row.salary_component_id}
                      onChange={(event) =>
                        updateRow(index, {
                          salary_component_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select component</option>
                      {components.map((component) => (
                        <option key={component.id} value={component.id}>
                          {component.code
                            ? `${component.code} - ${component.name}`
                            : component.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount" htmlFor={`ss_amount_${index}`}>
                    <TextInput
                      id={`ss_amount_${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) =>
                        updateRow(index, { amount: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Percentage" htmlFor={`ss_percent_${index}`}>
                    <TextInput
                      id={`ss_percent_${index}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={row.percentage}
                      onChange={(event) =>
                        updateRow(index, { percentage: event.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href="/dashboard/hr/payroll/salary-structures"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={invalid}>
              {isEdit ? "Save changes" : "Create salary structure"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
