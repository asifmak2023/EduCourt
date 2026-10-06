"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import {
  FeeVoucherGenerator,
  type FeeVoucherContext,
  type FeeVoucherStudent,
  type GenerateResult,
} from "./FeeVoucherGenerator";

export interface FeeVoucherDialogProps {
  open: boolean;
  student?: FeeVoucherStudent | null;
  context?: FeeVoucherContext;
  onClose: () => void;
  onGenerated?: (result: GenerateResult) => void;
}

export function FeeVoucherDialog({
  open,
  student = null,
  context,
  onClose,
  onGenerated,
}: FeeVoucherDialogProps) {
  const { canAny } = useAuth();

  if (!open || !canAny(AR_VIEW) || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <DialogFrame
      student={student}
      context={context}
      onClose={onClose}
      onGenerated={onGenerated}
    />,
    document.body
  );
}

function DialogFrame({
  student,
  context,
  onClose,
  onGenerated,
}: {
  student: FeeVoucherStudent | null;
  context?: FeeVoucherContext;
  onClose: () => void;
  onGenerated?: (result: GenerateResult) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="dialog-overlay fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate fee voucher"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Generate fee voucher
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Search a student, pick charges and an optional payment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--surface-secondary)] hover:text-foreground"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <FeeVoucherGenerator
            key={student?.id ?? "none"}
            initialStudent={student}
            initialContext={context}
            showSearch
            onGenerated={onGenerated}
          />
        </div>
      </div>
    </div>
  );
}
