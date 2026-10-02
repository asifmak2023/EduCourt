import type { InputFieldConfig } from "../types";

export interface FieldInputProps {
  field: InputFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  record: Record<string, unknown>;
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function toNumberOrEmpty(value: string): number | string {
  if (value.trim() === "") {
    return "";
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

export function isTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}
