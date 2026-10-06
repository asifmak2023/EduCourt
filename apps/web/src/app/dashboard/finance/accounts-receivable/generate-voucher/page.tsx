"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { GenerateVoucherCounter } from "@/components/fee-counter/GenerateVoucherCounter";

export default function GenerateVoucherPage() {
  return (
    <PermissionGate permission="fee.view">
      <GenerateVoucherCounter />
    </PermissionGate>
  );
}
