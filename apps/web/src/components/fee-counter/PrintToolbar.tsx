"use client";

import Link from "next/link";
import { Button } from "@/components/Form";

export interface PrintToolbarProps {
  backHref: string;
  backLabel?: string;
}

export function PrintToolbar({ backHref, backLabel = "Back" }: PrintToolbarProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        {backLabel}
      </Link>
      <Button type="button" variant="primary" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
