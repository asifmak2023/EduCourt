"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { buttonClasses } from "@/components/Form";

export interface ChargePrintButtonProps {
  chargeId: number;
  label?: string;
}

export function ChargePrintButton({
  chargeId,
  label = "Print",
}: ChargePrintButtonProps) {
  const { canAny } = useAuth();

  if (!canAny(AR_VIEW)) {
    return null;
  }

  return (
    <Link
      href={`/dashboard/finance/accounts-receivable/vouchers/${chargeId}`}
      className={buttonClasses("secondary")}
    >
      {label}
    </Link>
  );
}
