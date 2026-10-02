import type {
  AdminRecord,
  FieldConfig,
  GroupFieldConfig,
  InputFieldConfig,
  RepeaterFieldConfig,
} from "./types";

export function groupToggleKey(name: string): string {
  return `${name}__enabled`;
}

export function initialValues(
  fields: FieldConfig[]
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "photo") {
      continue;
    }
    if (field.type === "repeater") {
      values[field.name] = [];
      continue;
    }
    if (field.type === "group") {
      values[field.name] = initialValues(field.fields);
      values[groupToggleKey(field.name)] = false;
      continue;
    }
    values[field.name] =
      field.type === "checkbox" ? Boolean(field.defaultValue) : "";
  }
  return values;
}

export function mergeRecord(
  fields: FieldConfig[],
  record: AdminRecord
): Record<string, unknown> {
  const values = initialValues(fields);
  for (const field of fields) {
    if (field.type === "photo") {
      continue;
    }
    if (field.type === "repeater") {
      const existing = Array.isArray(record[field.name])
        ? (record[field.name] as Record<string, unknown>[])
        : [];
      values[field.name] = existing.map((item) =>
        field.rowFromItem ? field.rowFromItem(item) : { ...item }
      );
      continue;
    }
    if (field.type === "group") {
      const wrapped = record[field.wrapKey];
      if (wrapped && typeof wrapped === "object" && !Array.isArray(wrapped)) {
        const nested = { ...(values[field.name] as Record<string, unknown>) };
        for (const nestedField of field.fields) {
          const value = (wrapped as Record<string, unknown>)[nestedField.name];
          if (value !== undefined) {
            nested[nestedField.name] = value;
          }
        }
        values[field.name] = nested;
        values[groupToggleKey(field.name)] = true;
      }
      continue;
    }
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

export function hasRepeaterIdentity(
  field: RepeaterFieldConfig,
  row: Record<string, unknown>
): boolean {
  if (!field.identityKey) {
    return false;
  }
  return row[field.identityKey] !== "" &&
    row[field.identityKey] !== null &&
    row[field.identityKey] !== undefined;
}

export function groupIsEnabled(
  field: GroupFieldConfig,
  values: Record<string, unknown>
): boolean {
  const value = values[groupToggleKey(field.name)];
  return value === true || value === 1 || value === "1";
}

function isBlank(value: unknown): boolean {
  return value === "" || value === null || value === undefined;
}

export function isPlainField(field: FieldConfig): field is InputFieldConfig {
  return (
    field.type !== "photo" &&
    field.type !== "repeater" &&
    field.type !== "group"
  );
}

/**
 * Validates repeater rows and enabled groups. Returns field-name keyed errors
 * that mirror the API shape.
 */
export function validateNestedFields(
  fields: FieldConfig[],
  values: Record<string, unknown>,
  editing: boolean
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.type === "repeater") {
      const rows = Array.isArray(values[field.name])
        ? (values[field.name] as Record<string, unknown>[])
        : [];
      rows.forEach((row, index) => {
        if (hasRepeaterIdentity(field, row)) {
          return;
        }
        const filled = field.itemFields.some((itemField) => !isBlank(row[itemField.name]));
        if (!filled) {
          return;
        }
        const missing = field.itemFields.some(
          (itemField) => itemField.required && isBlank(row[itemField.name])
        );
        if (missing) {
          errors[field.name] = [
            `${field.label} ${index + 1} is missing a required field.`,
          ];
        }
      });
      continue;
    }

    if (field.type === "group") {
      if (!groupIsEnabled(field, values)) {
        continue;
      }
      if (editing && field.createOnly) {
        continue;
      }
      const nested = (values[field.name] as Record<string, unknown>) ?? {};
      for (const nestedField of field.fields) {
        if (nestedField.required && isBlank(nested[nestedField.name])) {
          errors[field.wrapKey] = ["Please complete the highlighted section."];
        }
      }
    }
  }

  return errors;
}

export async function resolveFormPayload(
  fields: FieldConfig[],
  values: Record<string, unknown>,
  editing: boolean,
  create: (
    endpoint: string,
    body: Record<string, unknown>
  ) => Promise<number>
): Promise<Record<string, unknown>> {
  const plain = fields.filter(isPlainField);
  const payload = buildPayload(plain, values, editing);

  for (const field of fields) {
    if (field.type !== "repeater") {
      continue;
    }

    const rows = Array.isArray(values[field.name])
      ? (values[field.name] as Record<string, unknown>[])
      : [];
    const items: Record<string, unknown>[] = [];

    for (const row of rows) {
      let id: unknown = field.identityKey ? row[field.identityKey] : null;

      if (isBlank(id) && field.createEndpoint && field.createBody) {
        const body = field.createBody(row);
        if (body && Object.keys(body).length > 0) {
          id = await create(field.createEndpoint, body);
        }
      }

      if (isBlank(id)) {
        continue;
      }

      items.push(field.mapItem(row, Number(id)));
    }

    if (items.length > 0 || editing) {
      payload[field.name] = items;
    }
  }

  for (const field of fields) {
    if (field.type !== "group") {
      continue;
    }
    if (editing && field.createOnly) {
      continue;
    }
    if (!groupIsEnabled(field, values)) {
      continue;
    }
    const nested = (values[field.name] as Record<string, unknown>) ?? {};
    const nestedPayload = buildPayload(field.fields, nested, false);
    if (Object.keys(nestedPayload).length > 0) {
      payload[field.wrapKey] = nestedPayload;
    }
  }

  return payload;
}

