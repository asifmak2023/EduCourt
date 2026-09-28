"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useResource } from "@/lib/useResource";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Pagination } from "@/components/Pagination";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { StudentWallet, WalletTransaction } from "@/lib/types";

export default function StudentWalletDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error, reload } =
    useResource<StudentWallet>(`/v1/canteen/wallets/${params.id}`);

  const [version, setVersion] = useState(0);
  const transactions = useList<WalletTransaction>(
    `/v1/canteen/wallets/${params.id}/transactions`,
    { _r: version }
  );

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpOk, setTopUpOk] = useState<string | null>(null);

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const topUp = async () => {
    setTopUpBusy(true);
    setTopUpError(null);
    setTopUpOk(null);
    try {
      await apiFetch(`/v1/canteen/wallets/${params.id}/top-up`, {
        method: "POST",
        body: {
          amount: Number(amount),
          method,
          ...(reference ? { reference } : {}),
        },
      });
      setAmount("");
      setReference("");
      setTopUpOk("Wallet topped up.");
      reload();
      setVersion((value) => value + 1);
    } catch (err: unknown) {
      setTopUpError(
        err instanceof ApiError ? err.message : "Unable to top up wallet."
      );
    } finally {
      setTopUpBusy(false);
    }
  };

  const adjust = async () => {
    setAdjustBusy(true);
    setAdjustError(null);
    try {
      await apiFetch(`/v1/canteen/wallets/${params.id}/adjust`, {
        method: "POST",
        body: {
          amount: Number(adjustAmount),
          ...(adjustNote ? { description: adjustNote } : {}),
        },
      });
      setAdjustAmount("");
      setAdjustNote("");
      reload();
      setVersion((value) => value + 1);
    } catch (err: unknown) {
      setAdjustError(
        err instanceof ApiError ? err.message : "Unable to adjust wallet."
      );
    } finally {
      setAdjustBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CanteenTabs active="wallets" />
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <CanteenTabs active="wallets" />
        <ErrorNotice message={error ?? "Wallet not found."} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CanteenTabs active="wallets" />

      <PageHeader
        title={data.student?.full_name ?? `Wallet #${data.id}`}
        description={data.student?.admission_no ?? undefined}
        actions={
          <Link
            href="/dashboard/canteen/wallets"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <SectionCard title="Wallet balance">
        <DataList>
          <DataItem
            label="Balance"
            value={
              <span className="text-lg font-semibold text-slate-900">
                {formatCurrency(data.balance)}
              </span>
            }
          />
          <DataItem
            label="Daily limit"
            value={data.daily_limit ? formatCurrency(data.daily_limit) : "-"}
          />
          <DataItem
            label="Low balance threshold"
            value={
              data.low_balance_threshold
                ? formatCurrency(data.low_balance_threshold)
                : "-"
            }
          />
          <DataItem
            label="Status"
            value={<Badge value={data.is_active ? "active" : "inactive"} />}
          />
        </DataList>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {can("canteen.create") ? (
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">Top up</h2>
            {topUpError ? (
              <div className="mt-4">
                <ErrorNotice message={topUpError} />
              </div>
            ) : null}
            {topUpOk ? (
              <div className="mt-4">
                <SuccessNotice message={topUpOk} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Amount" htmlFor="topup_amount" required>
                <TextInput
                  id="topup_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field label="Method" htmlFor="topup_method">
                <Select
                  id="topup_method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reference" htmlFor="topup_reference">
                  <TextInput
                    id="topup_reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                loading={topUpBusy}
                disabled={!amount || Number(amount) <= 0}
                onClick={topUp}
              >
                Top up
              </Button>
            </div>
          </Card>
        ) : null}

        {can("canteen.approve") ? (
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Adjust balance
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Use a negative amount to debit the wallet.
            </p>
            {adjustError ? (
              <div className="mt-4">
                <ErrorNotice message={adjustError} />
              </div>
            ) : null}
            <div className="mt-4 grid gap-4">
              <Field label="Amount" htmlFor="adjust_amount" required>
                <TextInput
                  id="adjust_amount"
                  type="number"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(event) => setAdjustAmount(event.target.value)}
                />
              </Field>
              <Field label="Description" htmlFor="adjust_note">
                <TextInput
                  id="adjust_note"
                  value={adjustNote}
                  onChange={(event) => setAdjustNote(event.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                loading={adjustBusy}
                disabled={!adjustAmount || Number(adjustAmount) === 0}
                onClick={adjust}
              >
                Apply adjustment
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Transactions
          </h2>
        </div>
        {transactions.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : transactions.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No transactions yet." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.items.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-5 py-3 text-slate-600">
                    {txn.transaction_date ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge value={txn.type ?? "unknown"} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {txn.description ?? txn.reference ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatCurrency(txn.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {transactions.meta ? (
          <Pagination
            page={transactions.page}
            lastPage={transactions.meta.last_page}
            total={transactions.meta.total}
            onPage={transactions.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
