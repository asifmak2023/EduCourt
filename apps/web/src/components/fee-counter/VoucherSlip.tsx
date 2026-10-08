/**
 * VoucherSlip — renders one fee voucher as three side-by-side copies:
 *   Bank / Accounts  |  Record Copy  |  Student Copy
 *
 * Used by both the single-voucher print page and the bulk-print page.
 */

import { amountInWords, formatCurrency, formatDate } from "@/lib/format";
import { PrintHeader } from "@/components/fee-counter/PrintHeader";
import type { FeeCharge, FeeChargeLine } from "@/lib/types";

const COPIES: Array<{ label: string }> = [
  { label: "Bank / Accounts" },
  { label: "Record Copy" },
  { label: "Student Copy" },
];

export interface VoucherSlipProps {
  charge: FeeCharge;
  /** Add a page-break after this slip (used in bulk print). */
  breakAfter?: boolean;
}

export function VoucherSlip({ charge, breakAfter = false }: VoucherSlipProps) {
  const amount = Number(charge.amount ?? 0);
  const discount = Number(charge.discount_amount ?? 0);
  const subtotal = amount + discount;
  const lines = charge.lines ?? [];

  const studentName = charge.student?.full_name ?? "-";
  const admissionNo = charge.student?.admission_no ?? "-";
  const className = charge.class_room?.name ?? "-";
  const sectionName = charge.section?.name ?? null;
  const classDegree = sectionName ? `${className} — ${sectionName}` : className;

  const issueDate = formatDate(charge.created_at ?? null);
  const dueDate = formatDate(charge.due_date);

  return (
    <div
      className={`voucher-slip-row w-full bg-white text-black${
        breakAfter ? " print:break-after-page" : ""
      }`}
    >
      {/* Screen: stack vertically with gap; Print: side-by-side, no gap */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-0 print:flex-row print:gap-0">
        {COPIES.map((copy, idx) => (
          <SingleCopy
            key={copy.label}
            copy={copy.label}
            isLast={idx === COPIES.length - 1}
            charge={charge}
            amount={amount}
            discount={discount}
            subtotal={subtotal}
            lines={lines}
            studentName={studentName}
            admissionNo={admissionNo}
            classDegree={classDegree}
            issueDate={issueDate}
            dueDate={dueDate}
          />
        ))}
      </div>
    </div>
  );
}

interface SingleCopyProps {
  copy: string;
  isLast: boolean;
  charge: FeeCharge;
  amount: number;
  discount: number;
  subtotal: number;
  lines: FeeChargeLine[];
  studentName: string;
  admissionNo: string;
  classDegree: string;
  issueDate: string;
  dueDate: string;
}

function SingleCopy({
  copy,
  isLast,
  charge,
  amount,
  discount,
  subtotal,
  lines,
  studentName,
  admissionNo,
  classDegree,
  issueDate,
  dueDate,
}: SingleCopyProps) {
  return (
    <div
      className={`flex-1 border border-black/70 p-3 text-[11px] leading-snug${
        isLast ? "" : " border-r-0 sm:border-r-0 print:border-r-0"
      }`}
      style={{ minWidth: 0 }}
    >
      {/* Header: school name + copy label */}
      <PrintHeader
        title={copy}
        campus={charge.campus}
        institution={charge.institution}
        compact
      />

      {/* Meta */}
      <div className="mt-2 space-y-0.5">
        <MetaRow label="Voucher No" value={charge.voucher_no} />
        <MetaRow label="Issue Date" value={issueDate} />
        <MetaRow label="Due Date" value={dueDate} />
      </div>

      <div className="my-2 border-t border-black/30" />

      {/* Student */}
      <div className="space-y-0.5">
        <MetaRow label="Student ID" value={admissionNo} />
        <MetaRow label="Name" value={studentName} />
        <MetaRow label="Class / Degree" value={classDegree} />
      </div>

      <div className="my-2 border-t border-black/30" />

      {/* Fee lines */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black/60">
            <th className="py-1 text-left font-semibold uppercase tracking-wide">
              Particular
            </th>
            <th className="py-1 text-right font-semibold uppercase tracking-wide">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines && lines.length > 0 ? (
            lines.map((line) => (
              <tr key={line.id} className="border-b border-black/10">
                <td className="py-0.5">
                  {line.fee_head?.name ?? line.description ?? charge.title ?? "Fee"}
                </td>
                <td className="py-0.5 text-right">{formatCurrency(line.amount)}</td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-black/10">
              <td className="py-0.5">{charge.title ?? "Fee"}</td>
              <td className="py-0.5 text-right">{formatCurrency(subtotal)}</td>
            </tr>
          )}
          {discount > 0 && (
            <tr className="border-b border-black/10">
              <td className="py-0.5 text-black/60">Discount</td>
              <td className="py-0.5 text-right text-black/60">
                − {formatCurrency(discount)}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/60 font-semibold">
            <td className="py-1 uppercase tracking-wide">Total Amount</td>
            <td className="py-1 text-right">{formatCurrency(amount)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Amount in words */}
      <p className="mt-2 text-[10px] leading-tight">
        <span className="font-semibold">Amount in words: </span>
        {amountInWords(amount)}
      </p>

      {/* Bank stamp */}
      <div className="mt-4 border-t border-black/40 pt-1 text-[10px] text-black/60">
        Bank Stamp &amp; Sign: ___________________________
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-1">
      <span className="w-24 shrink-0 text-black/60">{label}:</span>
      <span className="font-medium">{value}</span>
    </p>
  );
}
