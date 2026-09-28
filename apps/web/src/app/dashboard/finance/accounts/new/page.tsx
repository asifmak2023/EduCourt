"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useChartOfAccounts } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  AccountFields,
  emptyAccountProfile,
  type AccountProfile,
} from "@/components/AccountFields";
import { Card, ErrorNotice, PageHeader } from "@/components/ui";

export default function NewAccountPage() {
  return (
    <PermissionGate permission="finance.create">
      <NewAccountForm />
    </PermissionGate>
  );
}

function NewAccountForm() {
  const router = useRouter();
  const { items: accounts, loading: accountsLoading } = useChartOfAccounts();

  const [profile, setProfile] = useState<AccountProfile>(emptyAccountProfile());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const set = <K extends keyof AccountProfile>(
    key: K,
    value: AccountProfile[K]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const body: Record<string, unknown> = {
        code: profile.code,
        name: profile.name,
        account_type: profile.account_type,
        is_group: profile.is_group,
        is_active: profile.is_active,
      };

      if (profile.parent_id) {
        body.parent_id = Number(profile.parent_id);
      }
      if (profile.normal_balance) {
        body.normal_balance = profile.normal_balance;
      }
      if (profile.description) {
        body.description = profile.description;
      }

      const created = await apiFetch<{ data: { id: number } }>(
        "/v1/chart-of-accounts",
        { method: "POST", body }
      );

      router.push(`/dashboard/finance/accounts/${created.data.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to create account.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New account"
        description="Add a ledger account to the campus chart of accounts."
        actions={
          <Link
            href="/dashboard/finance/accounts"
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
          <AccountFields
            profile={profile}
            set={set}
            errors={errText}
            accounts={accounts}
            accountsLoading={accountsLoading}
          />
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/finance/accounts"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              Create account
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
