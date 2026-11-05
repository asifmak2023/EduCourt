"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Form";
import { PrintHeader } from "@/components/fee-counter/PrintHeader";
import { useAuth } from "@/lib/auth";
import type { Campus, Institution } from "@/lib/types";

export interface ReportPrintMeta {
  /** Report title printed in the header band. */
  title: string;
  /** Short scope line, e.g. "Attendance report - 01 Sep 2026 - 30 Sep 2026". */
  subtitle?: string | null;
  /** Extra filter text, e.g. "Class 5 - Academic year 2026-2027". */
  scope?: string | null;
}

/**
 * Wraps a report in a printable A4 document: school letterhead, title band,
 * filter summary, a generated-at/user footer and a print-only layout. Screen
 * chrome (range bar, tabs, actions) is hidden via the `.report-print-hide`
 * utility and the ink-friendly palette defined in globals.css.
 */
export function ReportDocument({
  title,
  subtitle,
  scope,
  children,
}: ReportPrintMeta & { children: ReactNode }) {
  const { user } = useAuth();

  const campus = (user?.campus as unknown as Campus | undefined) ?? null;
  const institution =
    (user?.institution as unknown as Institution | undefined) ?? null;

  return (
    <div className="report-document mx-auto max-w-5xl bg-white p-6 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none dark:bg-white">
      <div className="hidden print:block">
        <PrintHeader
          title={title}
          campus={campus}
          institution={institution}
        />
      </div>

      <div className="border-b-2 border-black/80 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-black print:hidden">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm font-medium text-black/80">{subtitle}</p>
            ) : null}
            {scope ? (
              <p className="mt-0.5 text-xs text-black/60">{scope}</p>
            ) : null}
          </div>
          <div className="text-right text-xs text-black/60">
            <p>Generated {new Date().toLocaleString("en-GB")}</p>
            {user ? <p>{user.name}</p> : null}
          </div>
        </div>
      </div>

      <div className="report-body mt-5 space-y-6">{children}</div>

      <div className="mt-8 flex items-end justify-between border-t border-black/30 pt-3 text-[11px] text-black/60">
        <p>
          {institution?.name ?? campus?.name ?? "EduCourt"} - confidential
          management report
        </p>
        <p>{title}</p>
      </div>
    </div>
  );
}

export interface ReportActionsProps {
  onPrint: () => void;
  onExport?: () => void;
  exportLabel?: string;
  exportDisabled?: boolean;
  extra?: ReactNode;
}

/** Screen-only toolbar with Print, optional CSV export and custom actions. */
export function ReportActions({
  onPrint,
  onExport,
  exportLabel = "Export CSV",
  exportDisabled = false,
  extra,
}: ReportActionsProps) {
  return (
    <div className="report-print-hide flex flex-wrap items-center gap-2 print:hidden">
      {extra}
      {onExport ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onExport}
          disabled={exportDisabled}
        >
          {exportLabel}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" onClick={onPrint}>
        Print
      </Button>
    </div>
  );
}

/** Section inside a printed report: keeps a chart/table from splitting pages. */
export function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="report-section break-inside-avoid">
      <div className="mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-black/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Simple, print-safe data table (no HeroUI chrome). */
export function ReportTable({
  columns,
  rows,
  empty = "No data for this selection.",
  align = [],
  totalRow,
}: {
  columns: string[];
  rows: (string | number | null | undefined)[][];
  empty?: string;
  align?: ("left" | "right")[];
  totalRow?: (string | number | null | undefined)[];
}) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="report-table w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-black/70">
            {columns.map((column, index) => (
              <th
                key={column}
                className={`py-1.5 pr-3 font-semibold ${
                  align[index] === "right" ? "text-right" : "text-left"
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-3 text-center text-black/60"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-black/20 even:bg-black/[0.03]"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`py-1.5 pr-3 ${
                      align[cellIndex] === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {cell ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {totalRow ? (
          <tfoot>
            <tr className="border-t-2 border-black/70 bg-black/[0.04] font-semibold">
              {totalRow.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`py-1.5 pr-3 ${
                    align[cellIndex] === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {cell ?? "-"}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

/** Quiet summary tiles that print as a bordered grid. */
export function ReportStatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded border border-black/20 px-3 py-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-black/50">
            {item.label}
          </p>
          <p className="mt-1 text-base font-bold text-black">{item.value}</p>
          {item.hint ? (
            <p className="text-[10px] text-black/50">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
