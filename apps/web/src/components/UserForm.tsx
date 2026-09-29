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
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import type { RoleOption } from "@/lib/types";

export interface UserFormInitial {
  name: string;
  email: string;
  phone: string;
  employee_code: string;
  job_title: string;
  is_active: boolean;
  roles: string[];
}

export function UserForm({
  title,
  description,
  recordId,
  initial,
  roleOptions,
  redirectTo,
}: {
  title: string;
  description?: string;
  recordId?: number;
  initial: UserFormInitial;
  roleOptions: RoleOption[];
  redirectTo: string;
}) {
  const router = useRouter();
  const isEdit = recordId !== undefined;

  const [values, setValues] = useState<UserFormInitial>(initial);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setValue = <K extends keyof UserFormInitial>(
    key: K,
    value: UserFormInitial[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const toggleRole = (role: string) => {
    setValues((current) => ({
      ...current,
      roles: current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role],
    }));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      name: values.name.trim(),
      email: values.email.trim(),
      is_active: values.is_active,
      roles: values.roles,
    };
    if (values.phone.trim()) body.phone = values.phone.trim();
    if (values.employee_code.trim()) {
      body.employee_code = values.employee_code.trim();
    }
    if (values.job_title.trim()) body.job_title = values.job_title.trim();
    if (password.trim()) body.password = password.trim();

    try {
      if (isEdit) {
        await apiFetch(`/v1/users/${recordId}`, { method: "PUT", body });
      } else {
        await apiFetch("/v1/users", { method: "POST", body });
      }
      router.push(redirectTo);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save this user.");
      }
    } finally {
      setBusy(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Link href={redirectTo} className={buttonClasses("secondary")}>
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
            <Field label="Name" htmlFor="user_name" required error={errorFor("name")}>
              <TextInput
                id="user_name"
                value={values.name}
                onChange={(event) => setValue("name", event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="user_email" required error={errorFor("email")}>
              <TextInput
                id="user_email"
                type="email"
                value={values.email}
                onChange={(event) => setValue("email", event.target.value)}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="user_password"
              required={!isEdit}
              hint={
                isEdit
                  ? "Leave blank to keep the current password."
                  : "At least 8 characters."
              }
              error={errorFor("password")}
            >
              <TextInput
                id="user_password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="user_phone" error={errorFor("phone")}>
              <TextInput
                id="user_phone"
                value={values.phone}
                onChange={(event) => setValue("phone", event.target.value)}
              />
            </Field>
            <Field
              label="Employee code"
              htmlFor="user_employee_code"
              error={errorFor("employee_code")}
            >
              <TextInput
                id="user_employee_code"
                value={values.employee_code}
                onChange={(event) =>
                  setValue("employee_code", event.target.value)
                }
              />
            </Field>
            <Field
              label="Job title"
              htmlFor="user_job_title"
              error={errorFor("job_title")}
            >
              <TextInput
                id="user_job_title"
                value={values.job_title}
                onChange={(event) => setValue("job_title", event.target.value)}
              />
            </Field>
          </div>

          <div className="border-t border-border px-6 py-5">
            <p className="text-sm font-medium text-foreground">Roles</p>
            <p className="mt-0.5 text-xs text-muted">
              At least one role is required.
            </p>
            {errorFor("roles") ? (
              <p className="mt-1 text-xs text-danger">{errorFor("roles")}</p>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {roleOptions.map((role) => (
                <Checkbox
                  key={role.value}
                  label={role.label}
                  checked={values.roles.includes(role.value)}
                  onChange={() => toggleRole(role.value)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <Checkbox
              label="Active"
              checked={values.is_active}
              onChange={(event) => setValue("is_active", event.target.checked)}
            />
            <div className="flex items-center gap-2">
              <Link href={redirectTo} className={buttonClasses("secondary")}>
                Cancel
              </Link>
              <Button type="submit" loading={busy}>
                {isEdit ? "Save changes" : "Create user"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
