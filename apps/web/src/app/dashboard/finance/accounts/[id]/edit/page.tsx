"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { useChartOfAccounts } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, buttonClasses } from "@/components/Form";
import {
  AccountFields,
  type AccountProfile,
} from "@/components/AccountFields";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { ChartOfAccount } from "@/lib/types";

export default function EditAccountPage() {
  return (
    <PermissionGate permission="finance.edit">
      <EditAccountLoader />
    </PermissionGate>
  );
}

function EditAccountLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ChartOfAccount>(
    id ? `/v1/chart-of-accounts/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Account not found." />;
  }

  return <EditAccountForm account={data} />;
}

function profileFromAccount(account: ChartOfAccount): AccountProfile {
  return {
    code: account.code ?? "",
    name: account.name ?? "",
    account_type: account.account_type ?? "asset",
    normal_balance: account.normal_balance ?? "",
    parent_id: account.parent_id ? String(account.parent_id) : "",
    is_group: account.is_group,
    is_active: account.is_active,
    description: account.description ?? "",
  };
}

function EditAccountForm({ account }: { account: ChartOfAccount }) {
  const router = useRouter();
  const { items: accounts, loading: accountsLoading } = useChartOfAccounts();

  const [profile, setProfile] = useState<AccountProfile>(
    profileFromAccount(account)
  );
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
        parent_id: profile.parent_id ? Number(profile.parent_id) : null,
        is_group: profile.is_group,
        is_active: profile.is_active,
        description: profile.description || null,
      };

      if (profile.normal_balance) {
        body.normal_balance = profile.normal_balance;
      }

      await apiFetch(`/v1/chart-of-accounts/${account.id}`, {
        method: "PUT",
        body,
      });

      router.push(`/dashboard/finance/accounts/${account.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) {
          setFieldErrors(err.errors);
        }
      } else {
        setError("Unable to save account.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${account.code}`}
        description={account.name}
        actions={
          <Link
            href={`/dashboard/finance/accounts/${account.id}`}
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
            excludeId={account.id}
          />
          <div className="flex items-center justify-end gap-2 border-t border-border-secondary px-6 py-4">
            <Link
              href={`/dashboard/finance/accounts/${account.id}`}
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
