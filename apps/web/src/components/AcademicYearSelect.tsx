"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Select } from "@/components/Form";

const COLLAPSED_COUNT = 5;

export type AcademicYearSelectOption = {
  value: string;
  label: string;
  is_current?: boolean;
};

export function AcademicYearSelect({
  id,
  name,
  value,
  options,
  placeholder = "Select",
  disabled,
  required,
  onChange,
}: {
  id?: string;
  name?: string;
  value: string;
  options: AcademicYearSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = options.length > COLLAPSED_COUNT;

  const visible = useMemo(
    () => visibleAcademicYearOptions(options, value, expanded, COLLAPSED_COUNT),
    [expanded, options, value]
  );

  return (
    <div className="space-y-1.5">
      <Select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {visible.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {canCollapse ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setExpanded((current) => !current)}
          className="text-xs font-medium text-accent hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function visibleAcademicYearOptions(
  options: AcademicYearSelectOption[],
  value: string,
  expanded: boolean,
  limit: number
): AcademicYearSelectOption[] {
  if (expanded || options.length <= limit) {
    return options;
  }

  const selected = options.find((option) => option.value === value);
  const sliced = options.slice(0, limit);

  if (selected && !sliced.some((option) => option.value === selected.value)) {
    return [...sliced.slice(0, Math.max(limit - 1, 0)), selected];
  }

  return sliced;
}
