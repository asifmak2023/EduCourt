"use client";

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

  if (!user) {
    return null;
  }

  if (!user.permissions.includes(permission)) {
    return (
      <ErrorNotice message="You do not have permission to view this page." />
    );
  }

  return <>{children}</>;
}
