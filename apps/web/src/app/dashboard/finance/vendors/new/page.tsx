"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { VendorForm } from "@/components/VendorForm";

export default function NewVendorPage() {
  return (
    <PermissionGate permission="finance.create">
      <VendorForm />
    </PermissionGate>
  );
}
