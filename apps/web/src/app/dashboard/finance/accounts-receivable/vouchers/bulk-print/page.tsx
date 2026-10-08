"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { AR_VIEW } from "@/lib/permissions";
import { apiFetch } from "@/lib/api";
import { VoucherSlip } from "@/components/fee-counter/VoucherSlip";
import { Spinner, ErrorNotice } from "@/components/ui";
import { Button } from "@/components/Form";
import type { FeeCharge } from "@/lib/types";

export default function BulkVoucherPrintPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <BulkVoucherPrint />
    </PermissionGate>
  );
}

function BulkVoucherPrint() {
  const searchParams = useSearchParams();
  const rawIds = searchParams?.get("ids") ?? "";

  const ids = rawIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  const [charges, setCharges] = useState<FeeCharge[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let active = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          ids.map((id) =>
            apiFetch<{ data: FeeCharge }>(`/v1/fee-charges/${id}`)
          )
        );

        if (!active) return;

        setCharges(results.map((r) => r.data));
      } catch {
        if (!active) return;
        setError("Failed to load one or more vouchers. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
    // ids changes only when the URL changes; stringify is stable for this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIds]);

  // Auto-print once all vouchers are loaded
  useEffect(() => {
    if (!loading && charges.length > 0 && typeof window !== "undefined") {
      const timer = window.setTimeout(() => window.print(), 400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, charges.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
        <span className="ml-3 text-sm text-muted">Loading vouchers…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorNotice message={error} />
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <div className="p-8 text-sm text-muted">No vouchers found.</div>
    );
  }

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between gap-3 p-4 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {charges.length} voucher{charges.length !== 1 ? "s" : ""}
          </span>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* All vouchers — each on its own print page */}
      <div className="space-y-8 print:space-y-0">
        {charges.map((charge, index) => (
          <div
            key={charge.id}
            className="mx-auto max-w-[1000px] bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none"
          >
            <VoucherSlip
              charge={charge}
              breakAfter={index < charges.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
