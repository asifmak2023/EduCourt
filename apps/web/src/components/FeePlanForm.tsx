"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useAcademicYears,
  useClassRooms,
  useFeeHeads,
} from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Repeater } from "@/components/Repeater";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { FeeInstallment, FeePlan, FeePlanItem } from "@/lib/types";

const emptyItem = (): FeePlanItem => ({
  fee_head_id: 0,
  amount: "",
  is_optional: false,
});

const emptyInstallment = (): FeeInstallment => ({
  label: "",
  due_date: "",
  percentage: "",
});

function formatMoney(value: number): string {
  return value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FeePlanForm({ feePlan }: { feePlan?: FeePlan }) {
  const router = useRouter();
  const isEdit = Boolean(feePlan);

  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes, loading: classesLoading } = useClassRooms();
  const { items: feeHeads, loading: headsLoading } = useFeeHeads();

  const [academicYearId, setAcademicYearId] = useState(
    feePlan?.academic_year_id ? String(feePlan.academic_year_id) : ""
  );
  const [classRoomId, setClassRoomId] = useState(
    feePlan?.class_room_id ? String(feePlan.class_room_id) : ""
  );
  const [name, setName] = useState(feePlan?.name ?? "");
  const [description, setDescription] = useState(feePlan?.description ?? "");
  const [isActive, setIsActive] = useState(feePlan?.is_active ?? true);
  const [lateFeeType, setLateFeeType] = useState(feePlan?.late_fee_type ?? "none");
  const [lateFeeAmount, setLateFeeAmount] = useState(
    feePlan?.late_fee_amount != null ? String(feePlan.late_fee_amount) : "0"
  );
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState(
    feePlan?.late_fee_grace_days != null ? String(feePlan.late_fee_grace_days) : "0"
  );

  const [items, setItems] = useState<FeePlanItem[]>(
    feePlan?.items && feePlan.items.length
      ? feePlan.items.map((item) => ({
          fee_head_id: item.fee_head_id,
          amount: String(item.amount ?? ""),
          is_optional: Boolean(item.is_optional),
        }))
      : [emptyItem()]
  );

  const [installments, setInstallments] = useState<FeeInstallment[]>(
    feePlan?.installments && feePlan.installments.length
      ? feePlan.installments.map((installment) => ({
          label: installment.label ?? "",
          due_date: installment.due_date ? installment.due_date.slice(0, 10) : "",
          percentage: String(installment.percentage ?? ""),
        }))
      : [emptyInstallment()]
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const updateItem = (index: number, patch: Partial<FeePlanItem>) => {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const updateInstallment = (index: number, patch: Partial<FeeInstallment>) => {
    setInstallments((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const requiredTotal = useMemo(
    () =>
      items
        .filter((item) => !item.is_optional)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  );

  const optionalTotal = useMemo(
    () =>
      items
        .filter((item) => item.is_optional)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  );

  const percentageTotal = useMemo(
    () =>
      installments.reduce(
        (sum, installment) => sum + (Number(installment.percentage) || 0),
        0
      ),
    [installments]
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        academic_year_id: Number(academicYearId),
        class_room_id: Number(classRoomId),
        name,
        is_active: isActive,
        late_fee_type: lateFeeType,
        late_fee_amount: Number(lateFeeAmount) || 0,
        late_fee_grace_days: Number(lateFeeGraceDays) || 0,
        items: items.map((item, index) => ({
          fee_head_id: Number(item.fee_head_id),
          amount: Number(item.amount) || 0,
          is_optional: Boolean(item.is_optional),
          sort_order: index,
        })),
        installments: installments.map((installment, index) => ({
          label: installment.label,
          due_date: installment.due_date,
          percentage: Number(installment.percentage) || 0,
          sequence: index + 1,
        })),
      };

      if (description) body.description = description;

      if (isEdit && feePlan) {
        await apiFetch(`/v1/fee-plans/${feePlan.id}`, { method: "PUT", body });
        router.push("/dashboard/finance/fee-plans");
        return;
      }

      await apiFetch("/v1/fee-plans", { method: "POST", body });
      router.push("/dashboard/finance/fee-plans");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save fee plan.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (yearsLoading || classesLoading || headsLoading) {
    return <Spinner />;
  }

  const invalid = items.every((item) => !item.fee_head_id) || Math.abs(percentageTotal - 100) > 0.01;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${feePlan?.name}` : "New fee plan"}
        description="Fee structure for one academic year and class, split into installments."
        actions={
          <Link
            href="/dashboard/finance/fee-plans"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Academic year" htmlFor="plan_year" required error={errText("academic_year_id")}>
              <Select
                id="plan_year"
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
              >
                <option value="">Select academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Class" htmlFor="plan_class" required error={errText("class_room_id")}>
              <Select
                id="plan_class"
                value={classRoomId}
                onChange={(event) => setClassRoomId(event.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plan name" htmlFor="plan_name" required error={errText("name")}>
              <TextInput
                id="plan_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="plan_description"
              className="sm:col-span-2 lg:col-span-3"
              error={errText("description")}
            >
              <TextArea
                id="plan_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="Late fee type" htmlFor="plan_late_type" error={errText("late_fee_type")}>
              <Select
                id="plan_late_type"
                value={lateFeeType}
                onChange={(event) => setLateFeeType(event.target.value)}
              >
                <option value="none">None</option>
                <option value="flat">Flat amount</option>
                <option value="percent">Percent of due</option>
              </Select>
            </Field>
            <Field label="Late fee amount" htmlFor="plan_late_amount" error={errText("late_fee_amount")}>
              <TextInput
                id="plan_late_amount"
                type="number"
                min={0}
                step="0.01"
                value={lateFeeAmount}
                onChange={(event) => setLateFeeAmount(event.target.value)}
              />
            </Field>
            <Field label="Grace days" htmlFor="plan_late_grace" error={errText("late_fee_grace_days")}>
              <TextInput
                id="plan_late_grace"
                type="number"
                min={0}
                value={lateFeeGraceDays}
                onChange={(event) => setLateFeeGraceDays(event.target.value)}
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
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Fee items</h2>
              <p className="text-sm text-muted">
                Required {formatMoney(requiredTotal)} - Optional {formatMoney(optionalTotal)}
              </p>
            </div>
            <Repeater<FeePlanItem>
              rows={items}
              onChange={setItems}
              addLabel="Add fee item"
              emptyRow={emptyItem}
              renderRow={(item, index) => (
                <>
                  <Field label="Fee head" htmlFor={`item_head_${index}`}>
                    <Select
                      id={`item_head_${index}`}
                      value={item.fee_head_id ? String(item.fee_head_id) : ""}
                      onChange={(event) =>
                        updateItem(index, { fee_head_id: Number(event.target.value) })
                      }
                    >
                      <option value="">Select fee head</option>
                      {feeHeads.map((head) => (
                        <option key={head.id} value={head.id}>
                          {head.code ? `${head.code} - ${head.name}` : head.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount" htmlFor={`item_amount_${index}`}>
                    <TextInput
                      id={`item_amount_${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={String(item.amount ?? "")}
                      onChange={(event) => updateItem(index, { amount: event.target.value })}
                    />
                  </Field>
                  <div className="flex items-end pb-2">
                    <Checkbox
                      label="Optional"
                      checked={item.is_optional}
                      onChange={(event) =>
                        updateItem(index, { is_optional: event.target.checked })
                      }
                    />
                  </div>
                </>
              )}
            />
          </div>

          <div className="border-t border-border-secondary px-6 py-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Installments</h2>
              <p className={`text-sm ${Math.abs(percentageTotal - 100) > 0.01 ? "text-danger" : "text-muted"}`}>
                Total {percentageTotal.toFixed(2)}% (must equal 100%)
              </p>
            </div>
            <Repeater<FeeInstallment>
              rows={installments}
              onChange={setInstallments}
              addLabel="Add installment"
              emptyRow={emptyInstallment}
              renderRow={(installment, index) => (
                <>
                  <Field label="Label" htmlFor={`inst_label_${index}`}>
                    <TextInput
                      id={`inst_label_${index}`}
                      value={installment.label}
                      onChange={(event) =>
                        updateInstallment(index, { label: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Due date" htmlFor={`inst_date_${index}`}>
                    <TextInput
                      id={`inst_date_${index}`}
                      type="date"
                      value={installment.due_date}
                      onChange={(event) =>
                        updateInstallment(index, { due_date: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Percentage" htmlFor={`inst_pct_${index}`}>
                    <TextInput
                      id={`inst_pct_${index}`}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={String(installment.percentage ?? "")}
                      onChange={(event) =>
                        updateInstallment(index, { percentage: event.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href="/dashboard/finance/fee-plans"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy} disabled={invalid}>
              {isEdit ? "Save changes" : "Create fee plan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
