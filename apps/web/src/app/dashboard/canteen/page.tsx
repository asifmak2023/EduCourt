"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Card, PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  CanteenDailyReport,
  CanteenItem,
  CanteenWalletSummary,
} from "@/lib/types";

export default function CanteenPage() {
  return (
    <PermissionGate permission="canteen.view">
      <CanteenHome />
    </PermissionGate>
  );
}

function CanteenHome() {
  const { can } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { data: daily } = useResource<CanteenDailyReport>(
    can("canteen.export")
      ? `/v1/canteen/reports/daily?from=${today}&to=${today}`
      : null
  );
  const { data: wallets } = useResource<CanteenWalletSummary>(
    can("canteen.export") ? "/v1/canteen/reports/wallet-summary" : null
  );
  const { data: lowStock } = useResource<CanteenItem[]>(
    "/v1/canteen/reports/low-stock"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canteen"
        description="Point of sale, stock, wallets and hygiene."
      />

      <CanteenTabs active="overview" />

      {daily || wallets || lowStock ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue today"
            value={formatCurrency(daily?.totals.revenue ?? 0)}
            hint={`${formatNumber(daily?.totals.bills ?? 0)} bills`}
          />
          <StatCard
            label="Low stock items"
            value={formatNumber(lowStock ? lowStock.length : 0)}
            tone={lowStock && lowStock.length > 0 ? "danger" : "positive"}
          />
          <StatCard
            label="Wallet balance"
            value={formatCurrency(wallets?.outstanding_balance ?? 0)}
            hint={`${formatNumber(wallets?.wallets ?? 0)} wallets`}
          />
          <StatCard
            label="Low balance wallets"
            value={formatNumber(wallets?.low_balance_wallets ?? 0)}
            tone={
              wallets && wallets.low_balance_wallets > 0 ? "danger" : "positive"
            }
          />
        </div>
      ) : can("canteen.export") || can("canteen.view") ? (
        <Spinner />
      ) : null}

      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Use the tabs above to manage menu items, record stock, ring up sales,
          top up student wallets and log hygiene checks.
        </p>
      </Card>
    </div>
  );
}
