"use client";

import { useState } from "react";
import { CanteenTabs } from "@/components/CanteenTabs";
import { TextInput } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  StatCard,
} from "@/components/ui";
import { useResource } from "@/lib/useResource";
import { formatCurrency } from "@/lib/format";
import type {
  CanteenDailyReport,
  CanteenItemWiseRow,
  CanteenProfitLoss,
  CanteenWalletSummary,
} from "@/lib/types";

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CanteenReportsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const query = `from=${from}&to=${to}`;

  const daily = useResource<CanteenDailyReport>(
    `/v1/canteen/reports/daily?${query}`
  );
  const itemWise = useResource<CanteenItemWiseRow[]>(
    `/v1/canteen/reports/item-wise?${query}`
  );
  const profitLoss = useResource<CanteenProfitLoss>(
    `/v1/canteen/reports/profit-loss?${query}`
  );
  const walletSummary = useResource<CanteenWalletSummary>(
    `/v1/canteen/reports/wallet-summary?${query}`
  );

  const loading =
    daily.loading ||
    itemWise.loading ||
    profitLoss.loading ||
    walletSummary.loading;

  return (
    <div className="space-y-6">
      <CanteenTabs active="reports" />

      <PageHeader
        title="Canteen reports"
        description="Sales, profitability and wallet activity for the selected range."
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <TextInput
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="w-44">
          <TextInput
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      {daily.error ? <ErrorNotice message={daily.error} /> : null}
      {profitLoss.error ? <ErrorNotice message={profitLoss.error} /> : null}
      {itemWise.error ? <ErrorNotice message={itemWise.error} /> : null}
      {walletSummary.error ? <ErrorNotice message={walletSummary.error} /> : null}

      {loading ? <Spinner /> : null}

      {daily.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Bills" value={daily.data.totals.bills} />
          <StatCard
            label="Revenue"
            value={formatCurrency(daily.data.totals.revenue)}
          />
          <StatCard
            label="Cost"
            value={formatCurrency(daily.data.totals.cost)}
          />
          <StatCard
            label="Discount"
            value={formatCurrency(daily.data.totals.discount)}
          />
        </div>
      ) : null}

      {profitLoss.data ? (
        <SectionCard title="Profit and loss">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Revenue"
              value={formatCurrency(profitLoss.data.revenue)}
            />
            <StatCard
              label="Cost of goods sold"
              value={formatCurrency(profitLoss.data.cost_of_goods_sold)}
            />
            <StatCard
              label="Gross profit"
              value={formatCurrency(profitLoss.data.gross_profit)}
            />
            <StatCard
              label="Wastage"
              value={formatCurrency(profitLoss.data.wastage)}
            />
            <StatCard
              label="Net profit"
              value={formatCurrency(profitLoss.data.net_profit)}
            />
            <StatCard
              label="Margin"
              value={
                profitLoss.data.margin_percentage === null
                  ? "-"
                  : `${profitLoss.data.margin_percentage}%`
              }
            />
          </div>
        </SectionCard>
      ) : null}

      {walletSummary.data ? (
        <SectionCard title="Wallets">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Wallets" value={walletSummary.data.wallets} />
            <StatCard
              label="Outstanding balance"
              value={formatCurrency(walletSummary.data.outstanding_balance)}
            />
            <StatCard
              label="Top ups"
              value={formatCurrency(walletSummary.data.top_ups)}
            />
            <StatCard
              label="Purchases"
              value={formatCurrency(walletSummary.data.purchases)}
            />
          </div>
        </SectionCard>
      ) : null}

      {daily.data ? (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">By day</h2>
          </div>
          {daily.data.by_day.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">
              No sales in this range.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Bills</th>
                  <th className="px-5 py-3 font-medium text-right">Revenue</th>
                  <th className="px-5 py-3 font-medium text-right">Cost</th>
                  <th className="px-5 py-3 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily.data.by_day.map((row) => (
                  <tr key={row.sold_on}>
                    <td className="px-5 py-3 text-slate-600">{row.sold_on}</td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {row.bills}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatCurrency(row.cost)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Item-wise sales
          </h2>
        </div>
        {!itemWise.data || itemWise.data.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">
            No item sales in this range.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium text-right">Quantity</th>
                <th className="px-5 py-3 font-medium text-right">Revenue</th>
                <th className="px-5 py-3 font-medium text-right">Cost</th>
                <th className="px-5 py-3 font-medium text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemWise.data.map((row) => (
                <tr key={row.canteen_item_id}>
                  <td className="px-5 py-3 text-slate-900">{row.item_name}</td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {row.quantity}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatCurrency(row.cost)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">
                    {formatCurrency(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
