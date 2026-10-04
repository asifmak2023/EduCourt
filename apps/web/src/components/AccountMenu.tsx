"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { roleSummary } from "@/lib/roles";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icons";

export function AccountMenu({
  profileHref = "/dashboard/profile",
}: {
  profileHref?: string;
}) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const tr = useTr();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("profile.menu")}
        className="flex items-center gap-1 rounded-full border border-border-secondary p-0.5 transition-colors hover:bg-surface-tertiary"
      >
        <Avatar name={user.name} photoUrl={user.photo_url} />
        <Icon
          name="chevronDown"
          className="me-1 h-3.5 w-3.5 text-muted"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border-secondary bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-0.5 truncate text-xs capitalize text-muted">
              {roleSummary(user.roles, t)}
            </p>
          </div>

          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent-soft hover:text-accent-soft-foreground"
          >
            <Icon name="idCard" className="h-4 w-4" />
            {tr("navigation.profile")}
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout().then(() => router.replace("/login"));
            }}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-tertiary hover:text-danger"
          >
            <Icon name="logout" className="h-4 w-4" />
            {t("common.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
