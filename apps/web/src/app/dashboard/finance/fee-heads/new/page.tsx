"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { FeeHeadForm } from "@/components/FeeHeadForm";

export default function NewFeeHeadPage() {
  return (
    <PermissionGate permission="fee.create">
      <FeeHeadForm />
    </PermissionGate>
  );
}
