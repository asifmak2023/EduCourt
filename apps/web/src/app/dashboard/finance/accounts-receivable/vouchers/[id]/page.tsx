"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { AR_VIEW } from "@/lib/permissions";
import { useResource } from "@/lib/useResource";
import { PrintToolbar } from "@/components/fee-counter/PrintToolbar";
import { VoucherSlip } from "@/components/fee-counter/VoucherSlip";
import { EmptyState, ErrorNotice, Spinner } from "@/components/ui";
import type { FeeCharge } from "@/lib/types";

export default function FeeVoucherPrintPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <FeeVoucherPrint />
    </PermissionGate>
  );
}

function FeeVoucherPrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, loading, error } = useResource<FeeCharge>(
    id ? `/v1/fee-charges/${id}` : null
  );

  useEffect(() => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const autoPrint =
      new URLSearchParams(window.location.search).get("print") === "1";

    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <EmptyState message="Voucher not found." />;
  }

  return (
    <div>
      <PrintToolbar
        backHref="/dashboard/finance/accounts-receivable/reports"
        backLabel="Back to receivables"
      />

      <div className="mx-auto max-w-[1000px] bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <VoucherSlip charge={data} />
      </div>
    </div>
  );
}
