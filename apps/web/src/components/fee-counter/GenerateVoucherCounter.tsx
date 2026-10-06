"use client";

import { PageHeader } from "@/components/ui";
import { FeeVoucherGenerator } from "./FeeVoucherGenerator";

export function GenerateVoucherCounter() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate voucher"
        description="Search a student, pick charges and optional payment, then generate."
      />
      <FeeVoucherGenerator showSearch />
    </div>
  );
}
