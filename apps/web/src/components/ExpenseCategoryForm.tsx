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
import type { ExpenseCategory } from "@/lib/types";

export function ExpenseCategoryForm({
  category,
}: {
  category?: ExpenseCategory;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const { items: accounts, loading } = useChartOfAccounts();

  const [code, setCode] = useState(category?.code ?? "");
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [expenseAccountId, setExpenseAccountId] = useState(
    category?.expense_account_id ? String(category.expense_account_id) : ""
  );
  const [sortOrder, setSortOrder] = useState(
    category?.sort_order !== undefined ? String(category.sort_order) : "0"
  );
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const expenseAccounts = accounts.filter(
    (account) =>
      account.account_type === "expense" && !account.is_group && account.is_active
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
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      };

      if (description) body.description = description;
      if (expenseAccountId) body.expense_account_id = Number(expenseAccountId);

      if (isEdit && category) {
        await apiFetch(`/v1/expense-categories/${category.id}`, {
          method: "PUT",
          body,
        });
        router.push("/dashboard/finance/expense-categories");
        return;
      }

      await apiFetch("/v1/expense-categories", { method: "POST", body });
      router.push("/dashboard/finance/expense-categories");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save expense category.");
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
        title={isEdit ? `Edit ${category?.name}` : "New expense category"}
        description="Categories map expense lines to ledger accounts."
        actions={
          <Link
            href="/dashboard/finance/expense-categories"
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
            <Field label="Code" htmlFor="category_code" required error={errText("code")}>
              <TextInput
                id="category_code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </Field>
            <Field
              label="Name"
              htmlFor="category_name"
              required
              className="sm:col-span-1 lg:col-span-2"
              error={errText("name")}
            >
              <TextInput
                id="category_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="Expense account"
              htmlFor="category_account"
              hint="Ledger account debited when this expense is approved."
              className="sm:col-span-2"
              error={errText("expense_account_id")}
            >
              <Select
                id="category_account"
                value={expenseAccountId}
                onChange={(event) => setExpenseAccountId(event.target.value)}
              >
                <option value="">Not set</option>
                {expenseAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Sort order"
              htmlFor="category_sort"
              error={errText("sort_order")}
            >
              <TextInput
                id="category_sort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="category_description"
              className="sm:col-span-2 lg:col-span-3"
              error={errText("description")}
            >
              <TextArea
                id="category_description"
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
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/finance/expense-categories"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
