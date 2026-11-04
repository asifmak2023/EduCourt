"use client";

import { Field, Select, TextInput } from "@/components/Form";
import { Card } from "@/components/ui";
import {
  REPORT_GRANULARITIES,
  describePeriod,
  type ReportGranularity,
  type ReportFilterState,
} from "@/lib/reportPeriod";

export interface ReportRangeBarProps {
  value: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
  supported?: ReportGranularity[];
  /** Hide the from/to inputs for reports that are bound to a fixed period. */
  showDates?: boolean;
  /** Hide the granularity switch for reports bound to an exam or student. */
  showPeriods?: boolean;
  children?: React.ReactNode;
}

/**
 * Shared report window control: a daily/weekly/monthly/yearly/overall switch
 * plus explicit date bounds. Any extra report-specific filters are passed as
 * children so every report keeps one consistent header control.
 */
export function ReportRangeBar({
  value,
  onChange,
  supported = ["day", "week", "month", "year", "all"],
  showDates = true,
  showPeriods = true,
  children,
}: ReportRangeBarProps) {
  const options = REPORT_GRANULARITIES.filter((option) =>
    supported.includes(option.value)
  );

  const setGranularity = (granularity: ReportGranularity) => {
    onChange({ ...value, granularity, from: "", to: "" });
  };

  return (
    <Card className="p-4 print:hidden" hoverable={false}>
      <div className="flex flex-wrap items-end gap-3">
        {showPeriods ? (
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Period
          </p>
          <div
            role="tablist"
            aria-label="Report period"
            className="inline-flex flex-wrap gap-1 rounded-full bg-surface-secondary p-1"
          >
            {options.map((option) => {
              const active = option.value === value.granularity;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGranularity(option.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

        {showDates ? (
          <>
        <div className="w-full sm:w-40">
          <Field label="From" htmlFor="report_from">
            <TextInput
              id="report_from"
              type="date"
              value={value.from}
              onChange={(event) =>
                onChange({ ...value, from: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="w-full sm:w-40">
          <Field label="To" htmlFor="report_to">
            <TextInput
              id="report_to"
              type="date"
              value={value.to}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
            />
          </Field>
        </div>
          </>
        ) : null}

        {children}
      </div>

      {showPeriods || showDates ? (
        <p className="mt-3 text-xs text-muted">
          Showing{" "}
          <span className="font-medium text-foreground">
            {describePeriod(value.granularity, value.from, value.to)}
          </span>
          {showDates ? (
            <>
              . Leave the dates blank to use the whole{" "}
              {value.granularity === "all" ? "history" : value.granularity}.
            </>
          ) : (
            "."
          )}
        </p>
      ) : null}
    </Card>
  );
}

export interface ReportYearSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { id: number; name: string }[];
  allLabel: string;
}

/** Academic/fiscal year picker used alongside the period range. */
export function ReportYearSelect({
  id,
  label,
  value,
  onChange,
  items,
  allLabel,
}: ReportYearSelectProps) {
  return (
    <div className="w-full sm:w-48">
      <Field label={label} htmlFor={id}>
        <Select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{allLabel}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
