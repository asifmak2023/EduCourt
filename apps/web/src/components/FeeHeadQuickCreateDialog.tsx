"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, apiFetch } from "@/lib/api";
import {
  Button,
  Field,
  Select,
  TextArea,
  TextInput,
  buttonClasses,
} from "@/components/Form";
import { ErrorNotice } from "@/components/ui";
import { useChartOfAccounts } from "@/lib/useLookups";
import type { FeeHead } from "@/lib/types";

export function FeeHeadQuickCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (head: FeeHead) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [incomeAccountId, setIncomeAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { items: accounts, loading: accountsLoading } =
    useChartOfAccounts(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const errText = (field: string) => fieldErrors[field]?.[0] ?? null;

  const reset = () => {
    setCode("");
    setName("");
    setIncomeAccountId("");
    setDescription("");
    setError(null);
    setFieldErrors({});
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        code,
        name,
        is_active: true,
      };

      if (incomeAccountId) {
        body.income_account_id = Number(incomeAccountId);
      }
      if (description) {
        body.description = description;
      }

      const response = await apiFetch<{ data: FeeHead }>("/v1/fee-heads", {
        method: "POST",
        body,
      });

      onCreated(response.data);
      reset();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create fee head.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="dialog-overlay fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New fee head"
        className="dialog-panel dialog-enter my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              New fee head
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Create a fee head and return to what you were doing.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
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
          {error ? <ErrorNotice message={error} /> : null}

          <div className="grid gap-4">
            <Field label="Code" htmlFor="fh_code" required error={errText("code")}>
              <TextInput
                id="fh_code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. TUIT"
              />
            </Field>
            <Field label="Name" htmlFor="fh_name" required error={errText("name")}>
              <TextInput
                id="fh_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Tuition Fee"
              />
            </Field>
            <Field
              label="Income account"
              htmlFor="fh_account"
              hint="Optional. Used when journal posting is enabled."
              error={errText("income_account_id")}
            >
              <Select
                id="fh_account"
                value={incomeAccountId}
                onChange={(event) => setIncomeAccountId(event.target.value)}
                disabled={accountsLoading}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code ? `${account.code} - ${account.name}` : account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Description"
              htmlFor="fh_description"
              error={errText("description")}
            >
              <TextArea
                id="fh_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
          <button
            type="button"
            className={buttonClasses("secondary")}
            onClick={close}
          >
            Cancel
          </button>
          <Button
            type="button"
            loading={busy}
            disabled={!code.trim() || !name.trim()}
            onClick={() => void submit()}
          >
            Create fee head
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
