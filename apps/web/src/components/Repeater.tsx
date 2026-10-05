"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Form";

export function Repeater<T>({
  rows,
  onChange,
  addLabel,
  emptyRow,
  renderRow,
  minRows = 1,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  addLabel: string;
  emptyRow: () => T;
  renderRow: (row: T, index: number) => ReactNode;
  minRows?: number;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-xl border border-border-secondary bg-content2/40 p-3"
        >
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {renderRow(row, index)}
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={rows.length <= minRows}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="shrink-0"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...rows, emptyRow()])}
      >
        {addLabel}
      </Button>
    </div>
  );
}
