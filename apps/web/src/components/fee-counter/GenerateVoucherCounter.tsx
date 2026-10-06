"use client";

import { useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { useAcademicYears, useClassRooms, useSections } from "@/lib/useLookups";
import { Button, Field, Select, TextInput } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
  SuccessNotice,
} from "@/components/ui";
import { FeeStructureQuickCreateDialog } from "@/components/FeeStructureQuickCreateDialog";
import { formatCurrency } from "@/lib/format";
import type {
  BillingKind,
  CounterDues,
  CounterStudent,
  ExamTerm,
  FeeCharge,
  FeeReceipt,
} from "@/lib/types";

type ReceiveType = "monthly" | "exam" | "other";

interface VoucherItem {
  key: string;
  billing_kind: BillingKind;
  title: string;
  amount: number;
  period_year?: number;
  period_month?: number;
  exam_term?: ExamTerm;
  fee_head_id?: number | null;
  fee_structure_item_id?: number | null;
  source: "structure" | "manual" | "other";
  lines: { fee_head_id?: number | null; description: string; amount: number }[];
}

interface GenerateResult {
  message: string;
  charges: FeeCharge[];
  receipt: FeeReceipt | null;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function GenerateVoucherCounter() {
  const [yearId, setYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const studentParams = useMemo(() => {
    const params: Record<string, string | number> = {};
    if (yearId) params.academic_year_id = yearId;
    if (classId) params.class_room_id = classId;
    if (sectionId) params.section_id = sectionId;
    return params;
  }, [yearId, classId, sectionId]);

  const {
    items: students,
    meta,
    loading: studentsLoading,
    error: studentsError,
    page,
    setPage,
    search,
    setSearch,
    reload: reloadStudents,
  } = useList<CounterStudent>("/v1/fee-counter/students", studentParams);

  const [selected, setSelected] = useState<CounterStudent | null>(null);

  const duesPath = selected
    ? `/v1/fee-counter/students/${selected.id}/dues${
        yearId || selected.academic_year_id
          ? `?academic_year_id=${yearId || selected.academic_year_id}`
          : ""
      }`
    : null;

  const {
    data: dues,
    loading: duesLoading,
    error: duesError,
    reload: reloadDues,
  } = useResource<CounterDues>(duesPath);

  const [receiveType, setReceiveType] = useState<ReceiveType>("monthly");
  const [monthKey, setMonthKey] = useState("");
  const [monthAmount, setMonthAmount] = useState("");
  const [examItemId, setExamItemId] = useState("");
  const [otherTitle, setOtherTitle] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());

  const [cart, setCart] = useState<VoucherItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  const [payNow, setPayNow] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payReference, setPayReference] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);

  const monthOptions = useMemo(() => {
    if (dues?.pending_months?.length) {
      return dues.pending_months.map((month) => ({
        value: `${month.period_year}-${month.period_month}`,
        label: `${MONTH_NAMES[month.period_month - 1]} ${month.period_year}`,
        amount: Number(month.amount),
        period_year: month.period_year,
        period_month: month.period_month,
      }));
    }

    const now = new Date();
    return [
      {
        value: `${now.getFullYear()}-${now.getMonth() + 1}`,
        label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
        amount: Number(dues?.structure?.monthly_amount ?? 0),
        period_year: now.getFullYear(),
        period_month: now.getMonth() + 1,
      },
    ];
  }, [dues]);

  const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);
  const discountValue = Number(discount) || 0;
  const netTotal = Math.max(subtotal - discountValue, 0);

  const resetEntry = () => {
    setMonthKey("");
    setMonthAmount("");
    setExamItemId("");
    setOtherTitle("");
    setOtherAmount("");
  };

  const selectStudent = (student: CounterStudent) => {
    setSelected(student);
    setCart([]);
    setResult(null);
    setError(null);
    setDiscount("");
    setDiscountNote("");
    setPayAmount("");
    setReceiveType("monthly");
    resetEntry();
  };

  const addMonthly = () => {
    const option = monthOptions.find((month) => month.value === monthKey);
    if (!option) {
      setError("Select the month to bill.");
      return;
    }

    const amount = Number(monthAmount) || option.amount;
    if (amount <= 0) {
      setError("Monthly amount must be greater than zero.");
      return;
    }

    const lines = (dues?.structure?.monthly_items ?? []).map((item) => ({
      fee_head_id: item.fee_head_id,
      description: item.name,
      amount: Number(item.amount),
    }));

    setCart((current) => [
      ...current,
      {
        key: `monthly-${option.value}-${Date.now()}`,
        billing_kind: "monthly",
        title: "Monthly Fee",
        amount,
        period_year: option.period_year,
        period_month: option.period_month,
        source: "structure",
        lines: lines.length ? lines : [{ description: "Monthly Fee", amount }],
      },
    ]);
    setError(null);
    resetEntry();
  };

  const addExam = () => {
    const item = dues?.structure?.exam_terms.find(
      (term) => String(term.id) === examItemId
    );

    if (!item) {
      setError("Select an exam term.");
      return;
    }

    setCart((current) => [
      ...current,
      {
        key: `exam-${item.id}-${Date.now()}`,
        billing_kind: "exam",
        title: item.name,
        amount: Number(item.amount),
        exam_term: item.exam_term,
        fee_head_id: item.fee_head_id,
        fee_structure_item_id: item.id,
        source: "structure",
        lines: [
          {
            fee_head_id: item.fee_head_id,
            description: item.name,
            amount: Number(item.amount),
          },
        ],
      },
    ]);
    setError(null);
    setExamItemId("");
  };

  const addOther = (title: string, amountValue: string) => {
    const amount = Number(amountValue) || 0;
    if (!title.trim() || amount <= 0) {
      setError("Enter a title and amount for the other charge.");
      return;
    }

    setCart((current) => [
      ...current,
      {
        key: `other-${Date.now()}`,
        billing_kind: "other",
        title: title.trim(),
        amount,
        source: "manual",
        lines: [{ description: title.trim(), amount }],
      },
    ]);
    setError(null);
    setOtherTitle("");
    setOtherAmount("");
  };

  const removeItem = (key: string) =>
    setCart((current) => current.filter((item) => item.key !== key));

  const generate = async () => {
    if (!selected || !dues) {
      setError("Select a student first.");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one charge to the voucher.");
      return;
    }

    if (discountValue > subtotal) {
      setError("Discount cannot exceed the total amount.");
      return;
    }

    const paymentAmount = payNow ? Number(payAmount) || 0 : 0;

    setBusy(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        student_id: selected.id,
        academic_year_id: dues.student.academic_year_id,
        discount_amount: discountValue,
        items: cart.map((item) => ({
          billing_kind: item.billing_kind,
          period_year: item.period_year ?? null,
          period_month: item.period_month ?? null,
          exam_term: item.exam_term ?? null,
          title: item.title,
          fee_head_id: item.fee_head_id ?? null,
          fee_structure_item_id: item.fee_structure_item_id ?? null,
          amount: item.amount,
          due_date: dueDate || null,
          source: item.source,
          lines: item.lines,
        })),
      };

      if (discountNote) {
        body.discount_note = discountNote;
      }

      if (paymentAmount > 0) {
        body.payment = {
          amount: paymentAmount,
          method: payMethod,
          reference: payReference || null,
          payment_date: dueDate || null,
        };
      }

      const response = await apiFetch<GenerateResult>("/v1/fee-counter/generate", {
        method: "POST",
        body,
      });

      setResult(response);
      setCart([]);
      setDiscount("");
      setDiscountNote("");
      setPayAmount("");
      setPayReference("");
      reloadDues();
      reloadStudents();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to generate the voucher.");
      }
    } finally {
      setBusy(false);
    }
  };

  const printReceipt = () => {
    if (!result || !selected) {
      return;
    }

    const rows = result.charges
      .map(
        (charge) =>
          `<tr><td>${charge.voucher_no}</td><td>${charge.title ?? charge.billing_kind_label ?? ""}</td><td style="text-align:right">${formatCurrency(charge.amount)}</td></tr>`
      )
      .join("");

    const receiptLine = result.receipt
      ? `<p><strong>Receipt:</strong> ${result.receipt.receipt_no} - ${formatCurrency(result.receipt.amount)} (${result.receipt.method_label ?? result.receipt.method ?? ""})</p>`
      : "";

    const win = window.open("", "_blank", "width=720,height=900");
    if (!win) {
      return;
    }

    win.document.write(`<!doctype html><html><head><title>Fee voucher</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border-bottom: 1px solid #ddd; padding: 8px; font-size: 14px; }
        th { text-align: left; background: #f5f5f5; }
      </style></head><body>
      <h1>Fee Voucher</h1>
      <p>${selected.full_name} (${selected.admission_no ?? ""})</p>
      <p>Class: ${dues?.student.class ?? "-"} / Section: ${dues?.student.section ?? "-"}</p>
      <table><thead><tr><th>Voucher No</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table>
      ${receiptLine}
      <script>window.onload = function () { window.print(); };</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate voucher"
        description="Search a student, pick charges and optional payment, then generate."
      />

      {error ? <ErrorNotice message={error} /> : null}
      {result ? <SuccessNotice message={result.message} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <div className="space-y-4 px-6 py-5">
            <h2 className="text-sm font-semibold text-foreground">Find student</h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Academic year" htmlFor="cv_year">
                <Select
                  id="cv_year"
                  value={yearId}
                  onChange={(event) => setYearId(event.target.value)}
                >
                  <option value="">All years</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Class" htmlFor="cv_class">
                <Select
                  id="cv_class"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                >
                  <option value="">All classes</option>
                  {classes.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section" htmlFor="cv_section">
                <Select
                  id="cv_section"
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                >
                  <option value="">All sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Search" htmlFor="cv_search">
              <TextInput
                id="cv_search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Admission no, name, roll no or phone"
              />
            </Field>

            <div className="max-h-[26rem] space-y-1 overflow-y-auto">
              {studentsError ? <ErrorNotice message={studentsError} /> : null}
              {studentsLoading ? (
                <Spinner />
              ) : students.length === 0 ? (
                <EmptyState message="No students match your filters." />
              ) : (
                students.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => selectStudent(student)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      selected?.id === student.id
                        ? "border-accent bg-[var(--surface-secondary)]"
                        : "border-border-secondary hover:bg-[var(--surface-secondary)]"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {student.full_name}
                      </span>
                      <span className="block text-xs text-muted">
                        {student.admission_no ?? "-"} - {student.class ?? "-"}
                        {student.section ? ` / ${student.section}` : ""}
                      </span>
                    </span>
                    <span className="text-right text-xs text-muted">
                      Due
                      <span className="block text-sm font-medium text-foreground">
                        {formatCurrency(student.outstanding)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="flex items-center justify-between text-sm text-muted">
                <button
                  type="button"
                  className="hover:text-foreground disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {meta.last_page}
                </span>
                <button
                  type="button"
                  className="hover:text-foreground disabled:opacity-40"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          {!selected ? (
            <Card>
              <EmptyState message="Select a student to see dues and generate a voucher." />
            </Card>
          ) : duesLoading ? (
            <Card>
              <Spinner />
            </Card>
          ) : duesError ? (
            <Card>
              <ErrorNotice message={duesError} />
            </Card>
          ) : dues ? (
            <>
              <Card>
                <div className="space-y-4 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {dues.student.full_name}
                      </h2>
                      <p className="text-sm text-muted">
                        {dues.student.admission_no ?? "-"} - {dues.student.class ?? "-"}
                        {dues.student.section ? ` / ${dues.student.section}` : ""}
                        {dues.student.roll_number
                          ? ` - Roll ${dues.student.roll_number}`
                          : ""}
                      </p>
                    </div>
                    {dues.student.guardian_phone ? (
                      <p className="text-sm text-muted">
                        Guardian: {dues.student.guardian_phone}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Billed" value={formatCurrency(dues.totals.billed)} />
                    <StatCard label="Paid" value={formatCurrency(dues.totals.paid)} />
                    <StatCard
                      label="Outstanding"
                      value={formatCurrency(dues.totals.outstanding)}
                    />
                  </div>

                  {dues.open_charges.length ? (
                    <div className="overflow-hidden rounded-xl border border-border-secondary">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                          <tr>
                            <th className="px-3 py-2">Voucher</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Due</th>
                            <th className="px-3 py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dues.open_charges.map((charge) => (
                            <tr
                              key={charge.id}
                              className="border-t border-border-secondary"
                            >
                              <td className="px-3 py-2">{charge.voucher_no}</td>
                              <td className="px-3 py-2 text-muted">
                                {charge.title ?? charge.billing_kind}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {charge.due_date ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(charge.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No open dues on record.</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="space-y-5 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      New charges
                    </h2>
                    {!dues.structure ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted">
                          No fee structure for this class.
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setStructureDialogOpen(true)}
                        >
                          Create fee structure
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="inline-flex rounded-xl border border-border-secondary p-1">
                    {(
                      [
                        ["monthly", "Monthly"],
                        ["exam", "Exam"],
                        ["other", "Others"],
                      ] as [ReceiveType, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReceiveType(value)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                          receiveType === value
                            ? "bg-accent text-accent-foreground"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {receiveType === "monthly" ? (
                    <div className="grid items-end gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
                      <Field label="Month" htmlFor="cv_month">
                        <Select
                          id="cv_month"
                          value={monthKey}
                          onChange={(event) => {
                            setMonthKey(event.target.value);
                            const option = monthOptions.find(
                              (month) => month.value === event.target.value
                            );
                            setMonthAmount(option ? String(option.amount) : "");
                          }}
                        >
                          <option value="">Select month</option>
                          {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Amount" htmlFor="cv_month_amount">
                        <TextInput
                          id="cv_month_amount"
                          type="number"
                          min={0}
                          step="0.01"
                          value={monthAmount}
                          onChange={(event) => setMonthAmount(event.target.value)}
                        />
                      </Field>
                      <Button type="button" onClick={addMonthly}>
                        Add month
                      </Button>
                    </div>
                  ) : receiveType === "exam" ? (
                    <div className="grid items-end gap-3 sm:grid-cols-[1.6fr_auto]">
                      <Field label="Exam term" htmlFor="cv_exam">
                        <Select
                          id="cv_exam"
                          value={examItemId}
                          onChange={(event) => setExamItemId(event.target.value)}
                          disabled={!dues.structure?.exam_terms.length}
                        >
                          <option value="">
                            {dues.structure?.exam_terms.length
                              ? "Select exam term"
                              : "No exam terms in structure"}
                          </option>
                          {(dues.structure?.exam_terms ?? []).map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.name} - {formatCurrency(term.amount)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Button type="button" onClick={addExam}>
                        Add exam
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dues.structure?.other_items.length ? (
                        <div className="flex flex-wrap gap-2">
                          {dues.structure.other_items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                addOther(item.name, String(item.amount))
                              }
                              className="rounded-full border border-border-secondary px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
                            >
                              + {item.name} ({formatCurrency(item.amount)})
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
                        <Field label="Title" htmlFor="cv_other_title">
                          <TextInput
                            id="cv_other_title"
                            value={otherTitle}
                            onChange={(event) => setOtherTitle(event.target.value)}
                            placeholder="e.g. Uniform"
                          />
                        </Field>
                        <Field label="Amount" htmlFor="cv_other_amount">
                          <TextInput
                            id="cv_other_amount"
                            type="number"
                            min={0}
                            step="0.01"
                            value={otherAmount}
                            onChange={(event) => setOtherAmount(event.target.value)}
                          />
                        </Field>
                        <Button
                          type="button"
                          onClick={() => addOther(otherTitle, otherAmount)}
                        >
                          Add charge
                        </Button>
                      </div>
                    </div>
                  )}

                  <Field label="Due date" htmlFor="cv_due">
                    <TextInput
                      id="cv_due"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </Field>

                  {cart.length ? (
                    <div className="overflow-hidden rounded-xl border border-border-secondary">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                          <tr>
                            <th className="px-3 py-2">Charge</th>
                            <th className="px-3 py-2">Period</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.key} className="border-t border-border-secondary">
                              <td className="px-3 py-2">{item.title}</td>
                              <td className="px-3 py-2 text-muted">
                                {item.period_month
                                  ? `${MONTH_NAMES[item.period_month - 1]} ${item.period_year}`
                                  : item.exam_term ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  className="text-xs text-danger hover:underline"
                                  onClick={() => removeItem(item.key)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      No charges added yet. Use the options above.
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Discount" htmlFor="cv_discount">
                      <TextInput
                        id="cv_discount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                      />
                    </Field>
                    <Field label="Discount note" htmlFor="cv_discount_note">
                      <TextInput
                        id="cv_discount_note"
                        value={discountNote}
                        onChange={(event) => setDiscountNote(event.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-sm">
                    <span className="text-muted">Voucher total</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(netTotal)}
                    </span>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border-secondary p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={payNow}
                        onChange={(event) => setPayNow(event.target.checked)}
                      />
                      Receive payment now
                    </label>

                    {payNow ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Amount" htmlFor="cv_pay_amount">
                          <TextInput
                            id="cv_pay_amount"
                            type="number"
                            min={0}
                            step="0.01"
                            value={payAmount}
                            onChange={(event) => setPayAmount(event.target.value)}
                            placeholder={netTotal ? String(netTotal) : "0.00"}
                          />
                        </Field>
                        <Field label="Method" htmlFor="cv_pay_method">
                          <Select
                            id="cv_pay_method"
                            value={payMethod}
                            onChange={(event) => setPayMethod(event.target.value)}
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Reference" htmlFor="cv_pay_reference">
                          <TextInput
                            id="cv_pay_reference"
                            value={payReference}
                            onChange={(event) => setPayReference(event.target.value)}
                          />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCart([]);
                        setDiscount("");
                        setDiscountNote("");
                      }}
                      disabled={!cart.length}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      loading={busy}
                      disabled={!cart.length}
                      onClick={() => void generate()}
                    >
                      Generate voucher
                    </Button>
                  </div>
                </div>
              </Card>

              {result ? (
                <Card>
                  <div className="space-y-4 px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-foreground">
                        Generated
                      </h2>
                      <Button type="button" variant="secondary" onClick={printReceipt}>
                        Print
                      </Button>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {result.charges.map((charge) => (
                        <li key={charge.id} className="flex justify-between gap-3">
                          <span className="text-muted">
                            {charge.voucher_no} - {charge.title ?? charge.billing_kind_label}
                          </span>
                          <span>{formatCurrency(charge.amount)}</span>
                        </li>
                      ))}
                      {result.receipt ? (
                        <li className="flex justify-between gap-3 border-t border-border-secondary pt-1 font-medium text-foreground">
                          <span>
                            Receipt {result.receipt.receipt_no}
                            {result.receipt.method_label
                              ? ` (${result.receipt.method_label})`
                              : ""}
                          </span>
                          <span>{formatCurrency(result.receipt.amount)}</span>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <FeeStructureQuickCreateDialog
        open={structureDialogOpen}
        academicYearId={dues?.student.academic_year_id ?? null}
        classRoomId={dues?.student.class_room_id ?? null}
        defaultName={dues?.student.class ? `${dues.student.class} fee structure` : ""}
        onClose={() => setStructureDialogOpen(false)}
        onCreated={() => reloadDues()}
      />
    </div>
  );
}
