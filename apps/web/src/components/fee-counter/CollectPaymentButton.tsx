"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Button, type ButtonVariant } from "@/components/Form";
import {
  CollectPaymentDialog,
  type CollectPaymentStudent,
} from "./CollectPaymentDialog";

export interface CollectPaymentButtonProps {
  student: CollectPaymentStudent;
  chargeId?: number | null;
  label?: string;
  variant?: ButtonVariant;
}

export function CollectPaymentButton({
  student,
  chargeId = null,
  label = "Collect payment",
  variant = "secondary",
}: CollectPaymentButtonProps) {
  const { canAny } = useAuth();
  const [open, setOpen] = useState(false);

  if (!canAny(AR_VIEW)) {
    return null;
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <CollectPaymentDialog
        open={open}
        student={student}
        chargeId={chargeId}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
