"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { FeePlanForm } from "@/components/FeePlanForm";

export default function NewFeePlanPage() {
  return (
    <PermissionGate permission="fee.create">
      <FeePlanForm />
    </PermissionGate>
  );
}
