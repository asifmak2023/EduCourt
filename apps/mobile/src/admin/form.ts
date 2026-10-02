import type { AdminRecord, InputFieldConfig } from "./types";

export function initialValues(
  fields: InputFieldConfig[]
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.name] =
      field.type === "checkbox" ? Boolean(field.defaultValue) : "";
  }
  return values;
}

export function mergeRecord(
  fields: InputFieldConfig[],
  record: AdminRecord
): Record<string, unknown> {
  const values = initialValues(fields);
  for (const field of fields) {
    if (record[field.name] !== undefined) {
      values[field.name] = record[field.name];
    }
  }
  return values;
}

export function buildPayload(
  fields: InputFieldConfig[],
  values: Record<string, unknown>,
  editing: boolean
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (editing && field.readOnlyOnEdit) {
      continue;
    }

    const value = values[field.name];

    if (field.type === "checkbox") {
      payload[field.name] = Boolean(value);
      continue;
    }

    if (field.type === "number") {
      if (value === "" || value === null || value === undefined) {
        continue;
      }
      payload[field.name] = Number(value);
      continue;
    }

    if (value === "" || value === null || value === undefined) {
      continue;
    }

    payload[field.name] = typeof value === "string" ? value.trim() : value;
  }

  return payload;
}
