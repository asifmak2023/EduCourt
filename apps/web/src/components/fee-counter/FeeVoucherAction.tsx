"use client";

import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Button, type ButtonVariant } from "@/components/Form";
import type { FeeVoucherStudent } from "./FeeVoucherGenerator";
import { useFeeVoucher } from "./FeeVoucherProvider";

export interface FeeVoucherActionProps {
  student?: FeeVoucherStudent | null;
  label?: string;
  variant?: ButtonVariant;
}

export function FeeVoucherAction({
  student = null,
  label = "Generate voucher",
  variant = "secondary",
}: FeeVoucherActionProps) {
  const { canAny } = useAuth();
  const { openVoucher } = useFeeVoucher();

  if (!canAny(AR_VIEW)) {
    return null;
  }

  return (
    <Button type="button" variant={variant} onClick={() => openVoucher({ student })}>
      {label}
    </Button>
  );
}
