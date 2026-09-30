"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
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
import { formatCurrency, formatDate } from "@/lib/format";
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
          <div className="border-b border-border-secondary px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">By day</h2>
          </div>
          {daily.data.by_day.length === 0 ? (
            <div className="px-5 py-6 text-sm text-muted">
              No sales in this range.
            </div>
          ) : (
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="By day">
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column className="text-right">Bills</Table.Column>
                  <Table.Column className="text-right">Revenue</Table.Column>
                  <Table.Column className="text-right">Cost</Table.Column>
                  <Table.Column className="text-right">Profit</Table.Column>
                </Table.Header>
                <Table.Body>
                {daily.data.by_day.map((row) => (
                  <Table.Row key={row.sold_on} id={row.sold_on}>
                    <Table.Cell className="text-muted">{formatDate(row.sold_on)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{row.bills}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(row.revenue)}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatCurrency(row.cost)}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(row.profit)}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Item-wise sales
          </h2>
        </div>
        {!itemWise.data || itemWise.data.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted">
            No item sales in this range.
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="Item-wise sales">
              <Table.Header>
                <Table.Column isRowHeader>Item</Table.Column>
                <Table.Column className="text-right">Quantity</Table.Column>
                <Table.Column className="text-right">Revenue</Table.Column>
                <Table.Column className="text-right">Cost</Table.Column>
                <Table.Column className="text-right">Profit</Table.Column>
              </Table.Header>
              <Table.Body>
              {itemWise.data.map((row) => (
                <Table.Row key={row.canteen_item_id} id={row.canteen_item_id}>
                  <Table.Cell className="text-foreground">{row.item_name}</Table.Cell>
                  <Table.Cell className="text-right text-muted">{row.quantity}</Table.Cell>
                  <Table.Cell className="text-right text-foreground">{formatCurrency(row.revenue)}</Table.Cell>
                  <Table.Cell className="text-right text-muted">{formatCurrency(row.cost)}</Table.Cell>
                  <Table.Cell className="text-right text-foreground">{formatCurrency(row.profit)}</Table.Cell>
                </Table.Row>
              ))}
              </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>
    </div>
  );
}
