"use client";

import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>
        {formatNumber(total)} record{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs text-slate-500">
          Page {page} of {lastPage}
        </span>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
