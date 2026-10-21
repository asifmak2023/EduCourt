"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { ListBox, Select as HeroSelect } from "@heroui/react";
import { useTr } from "@/lib/i18n";

const COLLAPSED_COUNT = 5;
const ANY_KEY = "__any__";
const SHOW_MORE_KEY = "__show_more__";
const SHOW_LESS_KEY = "__show_less__";

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
  const tr = useTr();
  const [expanded, setExpanded] = useState(true);
  const canCollapse = options.length > COLLAPSED_COUNT;

  const visible = useMemo(
    () => visibleAcademicYearOptions(options, value, expanded, COLLAPSED_COUNT),
    [expanded, options, value]
  );

  const selectedKey = value === "" ? ANY_KEY : String(value);

  return (
    <HeroSelect
      fullWidth
      name={name}
      aria-label={tr(placeholder)}
      isDisabled={disabled}
      isRequired={required}
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        const next = key === null ? "" : String(key);
        if (next === SHOW_MORE_KEY) {
          setExpanded(true);
          return;
        }
        if (next === SHOW_LESS_KEY) {
          setExpanded(false);
          return;
        }
        onChange({
          target: { value: next === ANY_KEY ? "" : next, name },
        } as unknown as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <HeroSelect.Trigger id={id}>
        <HeroSelect.Value />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox className="max-h-72 overflow-y-auto">
          <ListBox.Item id={ANY_KEY} textValue={tr(placeholder)}>
            {tr(placeholder)}
          </ListBox.Item>
          {visible.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              {option.label}
            </ListBox.Item>
          ))}
          {canCollapse && !expanded ? (
            <ListBox.Item id={SHOW_MORE_KEY} textValue="Show more">
              Show more
            </ListBox.Item>
          ) : null}
          {canCollapse && expanded ? (
            <ListBox.Item id={SHOW_LESS_KEY} textValue="Show less">
              Show less
            </ListBox.Item>
          ) : null}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
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
