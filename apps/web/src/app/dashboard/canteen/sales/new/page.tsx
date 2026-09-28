"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useCanteenItems, useStudents } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import {
  Button,
  buttonClasses,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { CANTEEN_PAYMENT_METHOD_OPTIONS } from "@/lib/canteenOptions";
import type { CanteenItem } from "@/lib/types";

interface SaleLine {
  canteen_item_id: string;
  quantity: string;
}

export default function NewCanteenSalePage() {
  return (
    <PermissionGate permission="canteen.create">
      <SaleForm />
    </PermissionGate>
  );
}

function SaleForm() {
  const router = useRouter();
  const { items: canteenItems } = useCanteenItems();
  const { items: students } = useStudents();
  const today = new Date().toISOString().slice(0, 10);

  const [lines, setLines] = useState<SaleLine[]>([]);
  const [lineItem, setLineItem] = useState("");
  const [lineQuantity, setLineQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [studentId, setStudentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
  const [soldOn, setSoldOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemById = new Map<number, CanteenItem>(
    canteenItems.map((item) => [item.id, item])
  );

  const subtotal = lines.reduce((sum, line) => {
    const item = itemById.get(Number(line.canteen_item_id));
    return sum + (item ? Number(item.price) * Number(line.quantity || 0) : 0);
  }, 0);
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  const addLine = () => {
    if (lineItem === "" || Number(lineQuantity) <= 0) return;
    setLines((current) => [
      ...current,
      { canteen_item_id: lineItem, quantity: lineQuantity },
    ]);
    setLineItem("");
    setLineQuantity("1");
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, i) => i !== index));
  };

  const needsStudent = paymentMethod === "wallet" || paymentMethod === "credit";

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await apiFetch("/v1/canteen/sales", {
        method: "POST",
        body: {
          payment_method: paymentMethod,
          ...(studentId ? { student_id: Number(studentId) } : {}),
          ...(!studentId && customerName ? { customer_name: customerName } : {}),
          ...(discount ? { discount: Number(discount) } : {}),
          ...(soldOn ? { sold_on: soldOn } : {}),
          ...(notes ? { notes } : {}),
          items: lines.map((line) => ({
            canteen_item_id: Number(line.canteen_item_id),
            quantity: Number(line.quantity),
          })),
        },
      });
      router.push("/dashboard/canteen/sales");
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to record sale.");
    } finally {
      setBusy(false);
    }
  };

  const ready =
    lines.length > 0 && (!needsStudent || studentId !== "");

  return (
    <div className="space-y-6">
      <CanteenTabs active="sales" />

      <PageHeader
        title="New canteen sale"
        description="Ring up a point-of-sale bill."
        actions={
          <Link
            href="/dashboard/canteen/sales"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Add items</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Item" htmlFor="sale_item">
            <Select
              id="sale_item"
              value={lineItem}
              onChange={(event) => setLineItem(event.target.value)}
            >
              <option value="">Select item</option>
              {canteenItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatCurrency(item.price)}
                  {item.track_stock
                    ? ` · ${item.stock_quantity} ${item.unit ?? ""}`
                    : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" htmlFor="sale_quantity">
            <TextInput
              id="sale_quantity"
              type="number"
              min="1"
              step="1"
              value={lineQuantity}
              onChange={(event) => setLineQuantity(event.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={addLine}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Bill lines ({lines.length})
          </h2>
        </div>
        {lines.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Add at least one item to the bill." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium text-right">Unit price</th>
                <th className="px-5 py-3 font-medium text-right">Quantity</th>
                <th className="px-5 py-3 font-medium text-right">Line total</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => {
                const item = itemById.get(Number(line.canteen_item_id));
                const lineTotal = item
                  ? Number(item.price) * Number(line.quantity || 0)
                  : 0;
                return (
                  <tr key={`${line.canteen_item_id}-${index}`}>
                    <td className="px-5 py-3 text-slate-900">
                      {item?.name ?? `#${line.canteen_item_id}`}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {item ? formatCurrency(item.price) : "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {line.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeLine(index)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Payment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Payment method" htmlFor="sale_method">
            <Select
              id="sale_method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              {CANTEEN_PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Student"
            htmlFor="sale_student"
            required={needsStudent}
            hint={needsStudent ? "Required for wallet and credit sales." : undefined}
          >
            <Select
              id="sale_student"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">None</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.admission_no})
                </option>
              ))}
            </Select>
          </Field>
          {!needsStudent ? (
            <Field label="Customer name" htmlFor="sale_customer">
              <TextInput
                id="sale_customer"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Discount" htmlFor="sale_discount">
            <TextInput
              id="sale_discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
          <Field label="Sold on" htmlFor="sale_date">
            <TextInput
              id="sale_date"
              type="date"
              value={soldOn}
              onChange={(event) => setSoldOn(event.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="sale_notes">
              <TextArea
                id="sale_notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-end gap-1 border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-500">
            Subtotal {formatCurrency(subtotal)} · Discount{" "}
            {formatCurrency(discountValue)}
          </span>
          <span className="text-lg font-semibold text-slate-900">
            Total {formatCurrency(total)}
          </span>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Link
          href="/dashboard/canteen/sales"
          className={buttonClasses("secondary")}
        >
          Cancel
        </Link>
        <Button type="button" loading={busy} disabled={!ready} onClick={submit}>
          Record sale
        </Button>
      </div>
    </div>
  );
}
