"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFamily } from "@/lib/family";
import {
  childName,
  classLabel,
  currentEnrollment,
  initials,
} from "@/lib/portal";
import { Card, Pill, SectionHeading } from "@/components/ui";
import { IconLogout, IconSchool, IconUser } from "@/components/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeChild } = useFamily();

  const enrollment = currentEnrollment(activeChild);
  const name = childName(activeChild);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-muted">Account and student details</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          {activeChild?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeChild.photo_url}
              alt={name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft font-[family-name:var(--font-display)] text-xl font-bold text-brand">
              {initials(name) || "?"}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-[family-name:var(--font-display)] text-lg font-bold">
              {name || "Student"}
            </h2>
            <p className="truncate text-sm text-muted">
              {classLabel(activeChild) || "No active enrollment"}
            </p>
            {activeChild?.admission_no ? (
              <p className="mt-1 text-xs text-muted">
                Admission no. {activeChild.admission_no}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2">
          <Detail label="Class" value={enrollment?.class_room?.name ?? "-"} />
          <Detail label="Section" value={enrollment?.section?.name ?? "-"} />
          <Detail label="Roll number" value={enrollment?.roll_number ?? "-"} />
          <Detail label="Academic year" value={enrollment?.academic_year?.name ?? "-"} />
          <Detail label="Status" value={activeChild?.status ?? "-"} />
          <Detail label="Gender" value={activeChild?.gender ?? "-"} />
        </dl>
      </Card>

      <Card>
        <SectionHeading title="Your account" subtitle="How you sign in" />
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Name" value={user?.name ?? "-"} />
          <Detail label="Email" value={user?.email ?? "-"} />
          <Detail label="Phone" value={user?.phone ?? "-"} />
          <Detail
            label="Two-factor"
            value={user?.two_factor_enabled ? "Enabled" : "Not enabled"}
          />
          <Detail label="Institution" value={user?.institution?.name ?? "-"} />
          <Detail label="Campus" value={user?.campus?.name ?? "-"} />
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <Pill tone="brand">
            <IconUser width={12} height={12} />
            {(user?.roles ?? []).join(", ").replace(/_/g, " ") || "portal"}
          </Pill>
          {user?.institution?.name ? (
            <Pill tone="muted">
              <IconSchool width={12} height={12} />
              {user.institution.name}
            </Pill>
          ) : null}
        </div>
      </Card>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] py-3 font-semibold text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]"
      >
        <IconLogout width={18} height={18} />
        Sign out
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel-muted px-3.5 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
