"use client";

import { useAuth } from "@/lib/auth";
import { Button, type ButtonVariant } from "@/components/Form";
import type { CounterStudent } from "@/lib/types";
import { useFeeVoucher } from "./FeeVoucherProvider";

export interface FeeVoucherActionProps {
  student?: CounterStudent | null;
  label?: string;
  variant?: ButtonVariant;
}

export function FeeVoucherAction({
  student = null,
  label = "Generate voucher",
  variant = "secondary",
}: FeeVoucherActionProps) {
  const { can } = useAuth();
  const { openVoucher } = useFeeVoucher();

  if (!can("fee.create")) {
    return null;
  }

  return (
    <Button type="button" variant={variant} onClick={() => openVoucher({ student })}>
      {label}
    </Button>
  );
}
