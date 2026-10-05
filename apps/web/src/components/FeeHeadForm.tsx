"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useChartOfAccounts } from "@/lib/useLookups";
import {
  Button,
  buttonClasses,
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { FeeHead } from "@/lib/types";

export function FeeHeadForm({ feeHead }: { feeHead?: FeeHead }) {
  const router = useRouter();
  const isEdit = Boolean(feeHead);
  const { items: accounts, loading } = useChartOfAccounts();

  const [code, setCode] = useState(feeHead?.code ?? "");
  const [name, setName] = useState(feeHead?.name ?? "");
  const [description, setDescription] = useState(feeHead?.description ?? "");
  const [incomeAccountId, setIncomeAccountId] = useState(
    feeHead?.income_account_id ? String(feeHead.income_account_id) : ""
  );
  const [sortOrder, setSortOrder] = useState(
    feeHead?.sort_order != null ? String(feeHead.sort_order) : "0"
  );
  const [isActive, setIsActive] = useState(feeHead?.is_active ?? true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const incomeAccounts = accounts.filter(
    (account) => account.account_type === "income" && !account.is_group && account.is_active
  );

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        code,
        name,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      };

      if (description) body.description = description;
      if (incomeAccountId) body.income_account_id = Number(incomeAccountId);

      if (isEdit && feeHead) {
        await apiFetch(`/v1/fee-heads/${feeHead.id}`, { method: "PUT", body });
        router.push("/dashboard/finance/fee-heads");
        return;
      }

      await apiFetch("/v1/fee-heads", { method: "POST", body });
      router.push("/dashboard/finance/fee-heads");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save fee head.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit ${feeHead?.name}` : "New fee head"}
        description="Charge categories used to build fee plans."
        actions={
          <Link
            href="/dashboard/finance/fee-heads"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code" htmlFor="fee_head_code" required error={errText("code")}>
              <TextInput
                id="fee_head_code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Field
              label="Name"
              htmlFor="fee_head_name"
              required
              className="sm:col-span-1 lg:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="fee_head_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Income account"
              htmlFor="fee_head_account"
              hint="Optional. Posts to this account when Fees subsystem is used."
              error={errText("income_account_id")}
            >
              <Select
                id="fee_head_account"
                value={incomeAccountId}
                onChange={(event) => setIncomeAccountId(event.target.value)}
              >
                <option value="">None</option>
                {incomeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Sort order"
              htmlFor="fee_head_sort"
              error={errText("sort_order")}
            >
              <TextInput
                id="fee_head_sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="fee_head_description"
              className="sm:col-span-2 lg:col-span-3"
              error={errText("description")}
            >
              <TextArea
                id="fee_head_description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href="/dashboard/finance/fee-heads"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create fee head"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
