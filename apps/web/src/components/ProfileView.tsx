"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { roleLabel } from "@/lib/roles";
import { Avatar } from "@/components/Avatar";
import { PhotoField } from "@/components/PhotoField";
import { Button, Field, PasswordInput } from "@/components/Form";
import {
  Card,
  DataItem,
  DataList,
  ErrorNotice,
  PageHeader,
  SectionCard,
  SuccessNotice,
} from "@/components/ui";

export function ProfileView() {
  const { user, refresh } = useAuth();
  const tr = useTr();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(null);
    setSubmitting(true);

    try {
      const response = await apiFetch<{ message: string }>("/v1/auth/password", {
        method: "PUT",
        body: {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDone(response.message ?? tr("profile.passwordUpdated"));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : tr("profile.passwordFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  const initials = user.name;

  return (
    <div className="space-y-6">
      <PageHeader title="profile.title" description="profile.subtitle" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
            <Avatar name={initials} photoUrl={user.photo_url} size="lg" />
            <div>
              <p className="text-lg font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted">{user.email}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-foreground"
                  >
                    {roleLabel(role, tr)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">{tr("profile.noRole")}</span>
              )}
            </div>
          </div>
          <div className="border-t border-border">
            <PhotoField
              endpoint="/v1/auth/photo"
              name={user.name}
              photoUrl={user.photo_url ?? null}
              showAvatar={false}
              showHeading={false}
              onChanged={() => {
                void refresh();
              }}
            />
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="profile.account" description="profile.subtitle">
            <DataList>
              <DataItem label="profile.email" value={user.email} />
              <DataItem label="profile.phone" value={user.phone ?? "-"} />
              <DataItem
                label="profile.employeeCode"
                value={user.employee_code ?? "-"}
              />
              <DataItem label="profile.jobTitle" value={user.job_title ?? "-"} />
              <DataItem
                label="profile.campus"
                value={user.campus?.name ?? "-"}
              />
              <DataItem
                label="profile.institution"
                value={user.institution?.name ?? "-"}
              />
            </DataList>
          </SectionCard>

          <SectionCard
            title="profile.changePassword"
            description="profile.changePasswordHint"
          >
            <form className="max-w-md space-y-4" onSubmit={handlePassword}>
              <Field label="profile.currentPassword" htmlFor="current-password" required>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </Field>

              <Field label="profile.newPassword" htmlFor="new-password" required>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </Field>

              <Field label="profile.confirmPassword" htmlFor="confirm-password" required>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>

              {error ? <ErrorNotice message={error} /> : null}
              {done ? <SuccessNotice message={done} /> : null}

              <Button type="submit" loading={submitting}>
                {tr("profile.changePassword")}
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
