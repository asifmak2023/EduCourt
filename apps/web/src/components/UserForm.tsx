"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCampuses, useInstitutions } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  PasswordInput,
  Select,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";
import { PhotoField } from "@/components/PhotoField";
import type { RoleOption } from "@/lib/types";

export interface UserFormInitial {
  name: string;
  email: string;
  phone: string;
  employee_code: string;
  job_title: string;
  institution_id: string;
  campus_id: string;
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
  photoUrl: initialPhotoUrl = null,
  canManagePhoto = false,
}: {
  title: string;
  description?: string;
  recordId?: number;
  initial: UserFormInitial;
  roleOptions: RoleOption[];
  redirectTo: string;
  photoUrl?: string | null;
  canManagePhoto?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = recordId !== undefined;
  const isPlatformAdmin = Boolean(user?.roles?.includes("platform_admin"));
  const showTenantSelectors = isPlatformAdmin && !isEdit;
  const { items: institutions } = useInstitutions(showTenantSelectors);
  const { items: campuses } = useCampuses(showTenantSelectors);

  const [values, setValues] = useState<UserFormInitial>(initial);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setValue = <K extends keyof UserFormInitial>(
    key: K,
    value: UserFormInitial[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const hasInstitutionHeadRole = values.roles.includes("institution_head");
  const needsInstitution = values.roles.some((role) => role !== "platform_admin");
  const needsCampus = values.roles.some(
    (role) => role !== "platform_admin" && role !== "institution_head"
  );
  const institutionCampuses = values.institution_id
    ? campuses.filter(
        (campus) => String(campus.institution_id) === values.institution_id
      )
    : campuses;

  const toggleRole = (role: string) => {
    setValues((current) => {
      const roles = current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];
      const campusNeeded = roles.some(
        (item) => item !== "platform_admin" && item !== "institution_head"
      );

      return {
        ...current,
        roles,
        campus_id: roles.includes("institution_head") && !campusNeeded
          ? ""
          : current.campus_id,
      };
    });
  };

  const submit = async () => {
    if (showTenantSelectors && needsInstitution && !values.institution_id) {
      setError("Select an institution for this account.");
      setFieldErrors({ institution_id: ["Institution is required."] });
      return;
    }

    if (showTenantSelectors && needsCampus && !values.campus_id) {
      setError("Select a campus for this account.");
      setFieldErrors({ campus_id: ["Campus is required."] });
      return;
    }

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
    if (showTenantSelectors && values.institution_id) {
      body.institution_id = Number(values.institution_id);
    }
    if (showTenantSelectors && values.campus_id && !hasInstitutionHeadRole) {
      body.campus_id = Number(values.campus_id);
    }

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

      {isEdit && canManagePhoto && recordId !== undefined ? (
        <div className="rounded-2xl border border-border bg-surface">
          <PhotoField
            endpoint={`/v1/users/${recordId}/photo`}
            name={values.name}
            photoUrl={photoUrl}
            onChanged={setPhotoUrl}
            hint="JPG, PNG or WebP, up to 5 MB. Used as this person's avatar across the portal."
          />
        </div>
      ) : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
            {showTenantSelectors ? (
              <>
                <Field
                  label="Institution"
                  htmlFor="user_institution"
                  required={needsInstitution}
                  hint="Required for every account except a platform super user."
                  error={errorFor("institution_id")}
                >
                  <Select
                    id="user_institution"
                    value={values.institution_id}
                    onChange={(event) => {
                      const institutionId = event.target.value;
                      setValues((current) => {
                        const campusStillValid = campuses.some(
                          (campus) =>
                            String(campus.id) === current.campus_id &&
                            String(campus.institution_id) === institutionId
                        );

                        return {
                          ...current,
                          institution_id: institutionId,
                          campus_id: campusStillValid ? current.campus_id : "",
                        };
                      });
                    }}
                  >
                    <option value="">Select institution</option>
                    {institutions.map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Campus"
                  htmlFor="user_campus"
                  required={needsCampus}
                  hint={
                    hasInstitutionHeadRole && !needsCampus
                      ? "Institution heads are not tied to one campus."
                      : "Only campuses in the selected institution are shown."
                  }
                  error={errorFor("campus_id")}
                >
                  <Select
                    id="user_campus"
                    value={values.campus_id}
                    disabled={
                      !values.institution_id ||
                      (hasInstitutionHeadRole && !needsCampus)
                    }
                    onChange={(event) => setValue("campus_id", event.target.value)}
                  >
                    <option value="">
                      {values.institution_id
                        ? "Select campus"
                        : "Select institution first"}
                    </option>
                    {institutionCampuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}
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
              <PasswordInput
                id="user_password"
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
