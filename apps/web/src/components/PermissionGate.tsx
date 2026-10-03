"use client";

import { useTranslation } from "@eis/i18n";
import { useAuth } from "@/lib/auth";
import { ErrorNotice } from "@/components/ui";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return null;
  }

  if (!user.permissions.includes(permission)) {
    return <ErrorNotice message={t("errors.forbidden")} />;
  }

  return <>{children}</>;
}
