"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useFamily } from "@/lib/family";
import { useTheme } from "@/lib/theme";
import {
  childName,
  classLabel,
  currentEnrollment,
  initials,
} from "@/lib/portal";
import { Card, PageTitle, Pill, SectionHeading } from "@/components/ui";
import {
  IconLogout,
  IconMoon,
  IconSchool,
  IconShield,
  IconSun,
  IconUser,
} from "@/components/Icons";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeChild } = useFamily();
  const { dark, toggle } = useTheme();

  const enrollment = currentEnrollment(activeChild);
  const name = childName(activeChild);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="space-y-5">
      <PageTitle eyebrow="Account & student" title="Profile" />

      {/* student ID card */}
      <Card padded={false} className="overflow-hidden">
        <div className="chalk-board flex items-center gap-4 px-5 py-5">
          {activeChild?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeChild.photo_url}
              alt={name}
              className="h-16 w-16 rounded-full border-2 border-white/25 object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/25 bg-white/10 font-[family-name:var(--font-display)] text-xl font-bold text-board-ink">
              {initials(name) || "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-urdu text-sm text-board-dim">طالب علم</p>
            <h2 className="truncate font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-none text-board-ink">
              {name || "Student"}
            </h2>
            <p className="mt-1 truncate text-sm text-board-dim">
              {classLabel(activeChild) || "No active enrollment"}
            </p>
          </div>
          {activeChild?.admission_no ? (
            <span className="ml-auto hidden shrink-0 rounded-md border border-white/20 px-2 py-1 text-right sm:block">
              <span className="block text-[9px] uppercase tracking-wider text-board-dim">
                Admission
              </span>
              <span className="numeric block font-[family-name:var(--font-display)] text-sm font-bold text-board-ink">
                {activeChild.admission_no}
              </span>
            </span>
          ) : null}
        </div>

        <dl className="grid gap-3 p-5 sm:grid-cols-2">
          <Detail label="Class" value={enrollment?.class_room?.name ?? "-"} />
          <Detail label="Section" value={enrollment?.section?.name ?? "-"} />
          <Detail label="Roll number" value={enrollment?.roll_number ?? "-"} />
          <Detail label="Academic year" value={enrollment?.academic_year?.name ?? "-"} />
          <Detail label="Status" value={activeChild?.status ?? "-"} />
          <Detail label="Gender" value={activeChild?.gender ?? "-"} />
        </dl>
      </Card>

      {/* account */}
      <Card>
        <SectionHeading title="Your account" subtitle="How you sign in to the family portal" />
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

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
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
          {user?.two_factor_enabled ? (
            <Pill tone="success">
              <IconShield width={12} height={12} />
              2FA on
            </Pill>
          ) : null}
        </div>
      </Card>

      {/* appearance + sign out */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              Appearance
            </p>
            <p className="text-sm text-muted">
              {dark ? "Dark board" : "Paper"} theme is on
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-foreground transition hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
          >
            {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
            Switch to {dark ? "paper" : "dark board"}
          </button>
        </div>
      </Card>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] py-3 font-semibold text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]"
      >
        <IconLogout width={18} height={18} />
        Sign out
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-3.5 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
