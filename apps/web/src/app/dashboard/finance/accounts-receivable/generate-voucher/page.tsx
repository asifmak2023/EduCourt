"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { AR_VIEW } from "@/lib/permissions";
import { GenerateVoucherCounter } from "@/components/fee-counter/GenerateVoucherCounter";

export default function GenerateVoucherPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <GenerateVoucherCounter />
    </PermissionGate>
  );
}
