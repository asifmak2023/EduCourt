"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInstitutions, useRoleOptions } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  PasswordInput,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";

export interface SsoProviderInitial {
  institution_id: string;
  name: string;
  provider: string;
  client_id: string;
  authorize_url: string;
  token_url: string;
  userinfo_url: string;
  logout_url: string;
  redirect_uri: string;
  scopes: string;
  default_role: string;
  is_active: boolean;
  jit_provisioning: boolean;
}

export function SsoProviderForm({
  title,
  description,
  recordId,
  initial,
  redirectTo,
}: {
  title: string;
  description?: string;
  recordId?: number;
  initial: SsoProviderInitial;
  redirectTo: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = recordId !== undefined;
  const isPlatformAdmin = Boolean(user?.roles?.includes("platform_admin"));

  const { items: institutions } = useInstitutions(isPlatformAdmin);
  const { items: roleList } = useRoleOptions();

  const [values, setValues] = useState<SsoProviderInitial>(initial);
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const setValue = <K extends keyof SsoProviderInitial>(
    key: K,
    value: SsoProviderInitial[K]
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      name: values.name.trim(),
      provider: values.provider || "oidc",
      client_id: values.client_id.trim(),
      authorize_url: values.authorize_url.trim(),
      token_url: values.token_url.trim(),
      userinfo_url: values.userinfo_url.trim(),
      redirect_uri: values.redirect_uri.trim(),
      scopes: values.scopes.trim() || null,
      default_role: values.default_role || null,
      is_active: values.is_active,
      jit_provisioning: values.jit_provisioning,
    };
    if (values.logout_url.trim()) body.logout_url = values.logout_url.trim();
    if (isPlatformAdmin) body.institution_id = Number(values.institution_id);
    if (clientSecret.trim()) body.client_secret = clientSecret.trim();

    try {
      if (isEdit) {
        await apiFetch(`/v1/sso-providers/${recordId}`, { method: "PUT", body });
      } else {
        await apiFetch("/v1/sso-providers", { method: "POST", body });
      }
      router.push(redirectTo);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save this SSO provider.");
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
            {isPlatformAdmin ? (
              <Field
                label="Institution"
                htmlFor="sso_institution"
                required
                error={errorFor("institution_id")}
              >
                <Select
                  id="sso_institution"
                  value={values.institution_id}
                  onChange={(event) =>
                    setValue("institution_id", event.target.value)
                  }
                >
                  <option value="">Select institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field
              label="Name"
              htmlFor="sso_name"
              required
              error={errorFor("name")}
            >
              <TextInput
                id="sso_name"
                value={values.name}
                onChange={(event) => setValue("name", event.target.value)}
              />
            </Field>
            <Field
              label="Protocol"
              htmlFor="sso_provider"
              hint="Generic OpenID Connect provider."
            >
              <Select
                id="sso_provider"
                value={values.provider}
                onChange={(event) => setValue("provider", event.target.value)}
              >
                <option value="oidc">OIDC</option>
              </Select>
            </Field>
            <Field
              label="Client ID"
              htmlFor="sso_client_id"
              required
              error={errorFor("client_id")}
            >
              <TextInput
                id="sso_client_id"
                value={values.client_id}
                onChange={(event) => setValue("client_id", event.target.value)}
              />
            </Field>
            <Field
              label="Client secret"
              htmlFor="sso_client_secret"
              required={!isEdit}
              hint={
                isEdit
                  ? "Leave blank to keep the current secret."
                  : undefined
              }
              error={errorFor("client_secret")}
            >
              <PasswordInput
                id="sso_client_secret"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
              />
            </Field>
            <Field
              label="Authorize URL"
              htmlFor="sso_authorize"
              required
              error={errorFor("authorize_url")}
            >
              <TextInput
                id="sso_authorize"
                value={values.authorize_url}
                onChange={(event) =>
                  setValue("authorize_url", event.target.value)
                }
              />
            </Field>
            <Field
              label="Token URL"
              htmlFor="sso_token"
              required
              error={errorFor("token_url")}
            >
              <TextInput
                id="sso_token"
                value={values.token_url}
                onChange={(event) => setValue("token_url", event.target.value)}
              />
            </Field>
            <Field
              label="Userinfo URL"
              htmlFor="sso_userinfo"
              required
              error={errorFor("userinfo_url")}
            >
              <TextInput
                id="sso_userinfo"
                value={values.userinfo_url}
                onChange={(event) =>
                  setValue("userinfo_url", event.target.value)
                }
              />
            </Field>
            <Field
              label="Logout URL"
              htmlFor="sso_logout"
              error={errorFor("logout_url")}
            >
              <TextInput
                id="sso_logout"
                value={values.logout_url}
                onChange={(event) => setValue("logout_url", event.target.value)}
              />
            </Field>
            <Field
              label="Redirect URI"
              htmlFor="sso_redirect"
              required
              error={errorFor("redirect_uri")}
            >
              <TextInput
                id="sso_redirect"
                value={values.redirect_uri}
                onChange={(event) =>
                  setValue("redirect_uri", event.target.value)
                }
              />
            </Field>
            <Field
              label="Default role"
              htmlFor="sso_default_role"
              hint="Role assigned to just-in-time provisioned users."
              error={errorFor("default_role")}
            >
              <Select
                id="sso_default_role"
                value={values.default_role}
                onChange={(event) =>
                  setValue("default_role", event.target.value)
                }
              >
                <option value="">No default role</option>
                {roleList.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Scopes"
              htmlFor="sso_scopes"
              className="sm:col-span-2"
              hint="Space separated, for example: openid profile email"
              error={errorFor("scopes")}
            >
              <TextArea
                id="sso_scopes"
                rows={2}
                value={values.scopes}
                onChange={(event) => setValue("scopes", event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <div className="flex flex-wrap items-center gap-6">
              <Checkbox
                label="Active"
                checked={values.is_active}
                onChange={(event) =>
                  setValue("is_active", event.target.checked)
                }
              />
              <Checkbox
                label="Just-in-time provisioning"
                checked={values.jit_provisioning}
                onChange={(event) =>
                  setValue("jit_provisioning", event.target.checked)
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Link href={redirectTo} className={buttonClasses("secondary")}>
                Cancel
              </Link>
              <Button type="submit" loading={busy}>
                {isEdit ? "Save changes" : "Create provider"}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
