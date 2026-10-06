"use client";

import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNotice } from "@/components/ui";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string | string[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return null;
  }

  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = required.some((entry) => user.permissions.includes(entry));

  if (!allowed) {
    return <ErrorNotice message={t("errors.forbidden")} />;
  }

  return <>{children}</>;
}
