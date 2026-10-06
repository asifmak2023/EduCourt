"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { FeeStructureForm } from "@/components/FeeStructureForm";

export default function NewFeeStructurePage() {
  return (
    <PermissionGate permission="fee.create">
      <FeeStructureForm />
    </PermissionGate>
  );
}
