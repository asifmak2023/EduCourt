"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { Button } from "@/components/Form";
import { FeeVoucherGenerator } from "./FeeVoucherGenerator";
import { BulkFeeVoucherDialog } from "./BulkFeeVoucherDialog";

export function GenerateVoucherCounter() {
  const { canAny } = useAuth();
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate voucher"
        description="Search a student, pick charges and optional payment, then generate."
        actions={
          canAny(AR_VIEW) ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBulkOpen(true)}
            >
              Generate for class
            </Button>
          ) : undefined
        }
      />
      <FeeVoucherGenerator showSearch />
      <BulkFeeVoucherDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
      />
    </div>
  );
}
