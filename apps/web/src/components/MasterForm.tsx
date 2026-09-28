"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";

export interface MasterField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "select" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  step?: string;
  min?: string;
  span?: 1 | 2;
  readOnlyOnEdit?: boolean;
  omitOnEdit?: boolean;
  hint?: string;
}

export type MasterValues = Record<string, string | boolean>;

export function MasterForm({
  title,
  description,
  endpoint,
  recordId,
  fields,
  initial,
  redirectTo,
  submitLabel,
  cancelHref,
}: {
  title: string;
  description?: string;
  endpoint: string;
  recordId?: number;
  fields: MasterField[];
  initial: MasterValues;
  redirectTo: string;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const isEdit = recordId !== undefined;

  const [values, setValues] = useState<MasterValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setValue = (name: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const visibleFields = fields.filter(
    (field) => !(isEdit && field.omitOnEdit)
  );

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {};

    for (const field of fields) {
      if (isEdit && field.omitOnEdit) continue;

      const value = values[field.name];

      if (field.type === "checkbox") {
        body[field.name] = Boolean(value);
        continue;
      }

      const text = String(value ?? "").trim();
      if (text === "") continue;

      body[field.name] = field.type === "number" ? Number(text) : text;
    }

    try {
      if (isEdit) {
        await apiFetch(`${endpoint}/${recordId}`, { method: "PUT", body });
      } else {
        await apiFetch(endpoint, { method: "POST", body });
      }
      router.push(redirectTo);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save.");
      }
    } finally {
      setBusy(false);
    }
  };

  const back = cancelHref ?? redirectTo;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href={back} className={buttonClasses("secondary")}>
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {visibleFields.map((field) => {
              const fieldError = fieldErrors[field.name]?.[0] ?? null;
              const id = `master_${field.name}`;
              const spanClass = field.span === 2 ? "sm:col-span-2" : "";

              if (field.type === "checkbox") {
                return (
                  <div key={field.name} className={`flex items-end ${spanClass}`}>
                    <Checkbox
                      label={field.label}
                      checked={Boolean(values[field.name])}
                      onChange={(event) =>
                        setValue(field.name, event.target.checked)
                      }
                    />
                  </div>
                );
              }

              return (
                <Field
                  key={field.name}
                  label={field.label}
                  htmlFor={id}
                  required={field.required}
                  hint={field.hint}
                  error={fieldError}
                  className={spanClass}
                >
                  {field.type === "select" ? (
                    <Select
                      id={id}
                      value={String(values[field.name] ?? "")}
                      disabled={isEdit && field.readOnlyOnEdit}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    >
                      <option value="">{field.placeholder ?? "Select"}</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <TextInput
                      id={id}
                      type={field.type ?? "text"}
                      step={field.step}
                      min={field.min}
                      value={String(values[field.name] ?? "")}
                      placeholder={field.placeholder}
                      readOnly={isEdit && field.readOnlyOnEdit}
                      disabled={isEdit && field.readOnlyOnEdit}
                      onChange={(event) => setValue(field.name, event.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link href={back} className={buttonClasses("secondary")}>
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {submitLabel ?? (isEdit ? "Save changes" : "Create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
