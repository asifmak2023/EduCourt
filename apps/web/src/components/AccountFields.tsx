"use client";

import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/Form";
import { Spinner } from "@/components/ui";
import type { ChartOfAccount } from "@/lib/types";

export interface AccountProfile {
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  parent_id: string;
  is_group: boolean;
  is_active: boolean;
  description: string;
}

export function emptyAccountProfile(): AccountProfile {
  return {
    code: "",
    name: "",
    account_type: "asset",
    normal_balance: "",
    parent_id: "",
    is_group: false,
    is_active: true,
    description: "",
  };
}

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export function AccountFields({
  profile,
  set,
  errors,
  accounts,
  accountsLoading,
  excludeId,
}: {
  profile: AccountProfile;
  set: <K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) => void;
  errors: (name: string) => string | null;
  accounts: ChartOfAccount[];
  accountsLoading: boolean;
  excludeId?: number;
}) {
  const parents = accounts.filter((account) => account.id !== excludeId);

  return (
    <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Code"
        htmlFor="code"
        required
        hint="Unique within the campus, e.g. 5010."
        error={errors("code")}
      >
        <TextInput
          id="code"
          value={profile.code}
          onChange={(event) => set("code", event.target.value)}
        />
      </Field>
      <Field
        label="Name"
        htmlFor="name"
        required
        className="sm:col-span-1 lg:col-span-2"
        error={errors("name")}
      >
        <TextInput
          id="name"
          value={profile.name}
          onChange={(event) => set("name", event.target.value)}
        />
      </Field>
      <Field
        label="Account type"
        htmlFor="account_type"
        required
        error={errors("account_type")}
      >
        <Select
          id="account_type"
          value={profile.account_type}
          onChange={(event) => set("account_type", event.target.value)}
        >
          {ACCOUNT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Normal balance"
        htmlFor="normal_balance"
        hint="Leave blank to derive from the account type."
        error={errors("normal_balance")}
      >
        <Select
          id="normal_balance"
          value={profile.normal_balance}
          onChange={(event) => set("normal_balance", event.target.value)}
        >
          <option value="">Derived from type</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </Select>
      </Field>
      <Field label="Parent account" htmlFor="parent_id" error={errors("parent_id")}>
        {accountsLoading ? (
          <Spinner />
        ) : (
          <Select
            id="parent_id"
            value={profile.parent_id}
            onChange={(event) => set("parent_id", event.target.value)}
          >
            <option value="">No parent (top level)</option>
            {parents.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} - {account.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        className="sm:col-span-2 lg:col-span-3"
        error={errors("description")}
      >
        <TextArea
          id="description"
          value={profile.description}
          onChange={(event) => set("description", event.target.value)}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
        <Checkbox
          label="Group account (holds no postings, used for roll-up)"
          checked={profile.is_group}
          onChange={(event) => set("is_group", event.target.checked)}
        />
        <Checkbox
          label="Active (available for posting)"
          checked={profile.is_active}
          onChange={(event) => set("is_active", event.target.checked)}
        />
      </div>
    </div>
  );
}
