"use client";

import { useEffect, type ReactNode } from "react";
import { PageHeader, ErrorNotice, Spinner, EmptyState } from "@/components/ui";
import { ReportsTabs } from "@/components/ReportsTabs";
import {
  ReportActions,
  ReportDocument,
} from "@/components/reports/ReportDocument";
import { ReportRangeBar } from "@/components/reports/ReportRangeBar";
import {
  describePeriod,
  type ReportFilterState,
  type ReportGranularity,
} from "@/lib/reportPeriod";

export interface ReportScaffoldProps {
  title: string;
  description: string;
  active: string;
  filters: ReportFilterState;
  onFiltersChange: (next: ReportFilterState) => void;
  /** Period options this report can meaningfully aggregate. */
  supported?: ReportGranularity[];
  /** Hide the from/to inputs for reports that are bound to a fixed period. */
  showDates?: boolean;
  /** Hide the granularity switch for reports bound to an exam or student. */
  showPeriods?: boolean;
  /** Extra report-specific filters rendered inside the range bar. */
  rangeExtras?: ReactNode;
  /** Overrides the printed title (defaults to `title`). */
  documentTitle?: string;
  /** Extra printed scope line, e.g. the selected class or academic year. */
  documentScope?: string | null;
  /** API-provided period label; falls back to the local description. */
  periodLabel?: string | null;
  onExport?: () => void;
  exportDisabled?: boolean;
  loading?: boolean;
  error?: string | null;
  /** Whether the report has data to render and print. */
  hasData?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
}

/**
 * The shared shell for every report page: screen header and tabs, period
 * controls, print/CSV actions and the printable A4 document. Report pages only
 * supply their filters and body, so period behaviour stays consistent.
 */
export function ReportScaffold({
  title,
  description,
  active,
  filters,
  onFiltersChange,
  supported,
  showDates = true,
  showPeriods = true,
  rangeExtras,
  documentTitle,
  documentScope,
  periodLabel,
  onExport,
  exportDisabled,
  loading = false,
  error = null,
  hasData = true,
  emptyMessage = "No data for this selection.",
  children,
}: ReportScaffoldProps) {
  const ready = !loading && !error && hasData;
  const subtitle =
    periodLabel ?? describePeriod(filters.granularity, filters.from, filters.to);

  useEffect(() => {
    if (!ready || typeof window === "undefined") {
      return;
    }

    const autoPrint =
      new URLSearchParams(window.location.search).get("print") === "1";

    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => window.print(), 500);

    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader title={title} description={description} />
      </div>
      <div className="print:hidden">
        <ReportsTabs active={active} />
      </div>

      <ReportRangeBar
        value={filters}
        onChange={onFiltersChange}
        supported={supported}
        showDates={showDates}
        showPeriods={showPeriods}
      >
        {rangeExtras}
      </ReportRangeBar>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Spinner />
      ) : error ? null : !hasData ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div className="print:hidden">
            <ReportActions
              onPrint={() => window.print()}
              onExport={onExport}
              exportLabel="Export CSV"
              exportDisabled={exportDisabled}
              extra={
                exportDisabled ? (
                  <span className="text-xs text-muted">
                    No rows to export yet.
                  </span>
                ) : null
              }
            />
          </div>

          <ReportDocument
            title={documentTitle ?? title}
            subtitle={subtitle}
            scope={documentScope}
          >
            {children}
          </ReportDocument>
        </>
      )}
    </div>
  );
}
