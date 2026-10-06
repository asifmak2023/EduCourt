"use client";

import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icons";
import { useFeeVoucher } from "./FeeVoucherProvider";

export function FeeVoucherQuickAction() {
  const { can } = useAuth();
  const { openVoucher } = useFeeVoucher();

  if (!can("fee.create")) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openVoucher()}
      title="Generate voucher"
      className="inline-flex items-center gap-2 rounded-lg border border-border-secondary px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-tertiary hover:text-foreground"
    >
      <Icon name="receipt" className="h-4 w-4" />
      <span className="hidden md:inline">Generate voucher</span>
    </button>
  );
}
