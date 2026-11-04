"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  CanteenDailyReport,
  CanteenItem,
  CanteenWalletSummary,
} from "@/lib/types";

const CANTEEN_SECTIONS: HubSection[] = [
  {
    href: "/dashboard/canteen/items",
    title: "Menu items",
    description: "Prices, categories and availability.",
    icon: "receipt",
  },
  {
    href: "/dashboard/canteen/suppliers",
    title: "Suppliers",
    description: "Vendors that stock the canteen.",
    icon: "box",
  },
  {
    href: "/dashboard/canteen/stock-entries",
    title: "Stock",
    description: "Record received stock and adjustments.",
    icon: "clipboard",
  },
  {
    href: "/dashboard/canteen/sales",
    title: "Sales",
    description: "Ring up counter bills against wallets or cash.",
    icon: "banknote",
  },
  {
    href: "/dashboard/canteen/wallets",
    title: "Wallets",
    description: "Student balances and top-ups.",
    icon: "wallet",
  },
  {
    href: "/dashboard/canteen/hygiene",
    title: "Hygiene",
    description: "Routine kitchen and counter checks.",
    icon: "shield",
  },
  {
    href: "/dashboard/canteen/reports",
    title: "Reports",
    description: "Daily revenue, stock and wallet summaries.",
    icon: "chart",
  },
];

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
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Canteen"
        description="Point of sale, stock, wallets and hygiene."
      />

      <CanteenTabs active="overview" />

      {daily || wallets || lowStock ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <HubGrid sections={CANTEEN_SECTIONS} />
    </div>
  );
}
