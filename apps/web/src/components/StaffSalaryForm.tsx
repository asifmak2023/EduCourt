"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useSalaryComponents, useStaffMembers } from "@/lib/useLookups";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { StaffSalary } from "@/lib/types";

interface ItemRow {
  salary_component_id: string;
  amount: string;
  percentage: string;
}

const EMPTY_ROW: ItemRow = {
  salary_component_id: "",
  amount: "",
  percentage: "",
};

export function StaffSalaryForm({
  recordId,
  initial,
}: {
  recordId?: number;
  initial?: StaffSalary;
}) {
  const router = useRouter();
  const { items: staff, loading: loadingStaff } = useStaffMembers();
  const { items: components, loading: loadingComponents } =
    useSalaryComponents();

  const isEdit = recordId !== undefined;
  const loading = loadingStaff || loadingComponents;

  const [staffMemberId, setStaffMemberId] = useState(
    initial ? String(initial.staff_member_id) : ""
  );
  const [basicSalary, setBasicSalary] = useState(initial?.basic_salary ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "PKR");
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial?.effective_from ?? ""
  );
  const [effectiveTo, setEffectiveTo] = useState(initial?.effective_to ?? "");
  const [isActive, setIsActive] = useState(initial ? initial.is_active : true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    initial?.items?.map((item) => ({
      salary_component_id: String(item.salary_component_id),
      amount: item.amount ?? "",
      percentage: item.percentage ?? "",
    })) ?? []
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;

  const setRow = (index: number, patch: Partial<ItemRow>) => {
    setItems((current) =>
      current.map((row, position) =>
        position === index ? { ...row, ...patch } : row
      )
    );
  };

  const submit = async () => {
    setBusy(true);
    setError(null);

    const body = {
      staff_member_id: Number(staffMemberId),
      basic_salary: Number(basicSalary),
      currency,
      effective_from: effectiveFrom,
      ...(effectiveTo ? { effective_to: effectiveTo } : {}),
      is_active: isActive,
      ...(notes ? { notes } : {}),
      items: items
        .filter((row) => row.salary_component_id)
        .map((row) => ({
          salary_component_id: Number(row.salary_component_id),
          ...(row.amount ? { amount: Number(row.amount) } : {}),
          ...(row.percentage ? { percentage: Number(row.percentage) } : {}),
        })),
    };

    try {
      if (isEdit) {
        await apiFetch(`/v1/staff-salaries/${recordId}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch("/v1/staff-salaries", { method: "POST", body });
      }
      router.push("/dashboard/hr/payroll/salaries");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to save.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit salary structure" : "New salary structure"}
        description="Basic salary and component lines for a staff member."
        actions={
          <Link
            href="/dashboard/hr/payroll/salaries"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Staff" htmlFor="salary_staff" required>
            <Select
              id="salary_staff"
              value={staffMemberId}
              onChange={(event) => setStaffMemberId(event.target.value)}
            >
              <option value="">Select staff</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.employee_no})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Basic salary" htmlFor="salary_basic" required>
            <TextInput
              id="salary_basic"
              type="number"
              min="0"
              step="0.01"
              value={basicSalary}
              onChange={(event) => setBasicSalary(event.target.value)}
            />
          </Field>
          <Field label="Currency" htmlFor="salary_currency">
            <TextInput
              id="salary_currency"
              maxLength={3}
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Effective from" htmlFor="salary_from" required>
            <TextInput
              id="salary_from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </Field>
          <Field label="Effective to" htmlFor="salary_to">
            <TextInput
              id="salary_to"
              type="date"
              value={effectiveTo}
              onChange={(event) => setEffectiveTo(event.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="salary_notes">
            <TextInput
              id="salary_notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 rounded border-border-secondary"
          />
          Active
        </label>

        <div className="mt-6 border-t border-border-secondary pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Component lines
            </h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItems((current) => [...current, { ...EMPTY_ROW }])}
            >
              Add line
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No component lines. The basic salary alone will be used.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {items.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <Select
                    value={row.salary_component_id}
                    onChange={(event) =>
                      setRow(index, { salary_component_id: event.target.value })
                    }
                  >
                    <option value="">Select component</option>
                    {components.map((component) => (
                      <option key={component.id} value={component.id}>
                        {component.name} ({component.type})
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(event) =>
                      setRow(index, { amount: event.target.value })
                    }
                  />
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Percentage"
                    value={row.percentage}
                    onChange={(event) =>
                      setRow(index, { percentage: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setItems((current) =>
                        current.filter((_, position) => position !== index)
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            loading={busy}
            disabled={!staffMemberId || !basicSalary || !effectiveFrom}
            onClick={submit}
          >
            {isEdit ? "Save changes" : "Create structure"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
