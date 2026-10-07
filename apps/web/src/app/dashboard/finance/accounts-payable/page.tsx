"use client";

import Link from "next/link";
import { useTranslation, type MessageKey } from "@eis/i18n";
import { useJson } from "@/lib/useJson";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  BarStatChart,
  ChartCard,
  DonutChart,
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import type { PayableSummary } from "@/lib/types";

const STATUS_KEYS: Record<string, MessageKey> = {
  draft: "status.draft",
  pending_approval: "status.pendingApproval",
  approved: "status.approved",
  partial: "status.partial",
  paid: "status.paid",
  cancelled: "status.cancelled",
};

const CATEGORY_KEYS: Record<string, MessageKey> = {
  staff_salary: "financeAp.categoryStaffSalary",
  utility: "financeAp.categoryUtility",
  purchase: "financeAp.categoryPurchase",
  other: "financeAp.categoryOther",
  legacy: "financeAp.categoryLegacy",
};

function compactCurrency(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function AccountsPayablePage() {
  return (
    <PermissionGate permission="finance.view">
      <AccountsPayableOverview />
    </PermissionGate>
  );
}

function AccountsPayableOverview() {
  const { t } = useTranslation();
  const { data: summary, loading, error } = useJson<PayableSummary>(
    "/v1/payable-reports/summary"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="financeAp.title"
        description="financeAp.description"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/finance/vendors"
              className={buttonClasses("secondary")}
            >
              {t("financeAp.vendors")}
            </Link>
          </div>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="financeAp.totalPayable"
              value={formatCurrency(summary.totals.payable)}
            />
            <StatCard
              label="financeAp.totalPaid"
              value={formatCurrency(summary.totals.paid)}
              tone="positive"
            />
            <StatCard
              label="financeAp.outstanding"
              value={formatCurrency(summary.totals.outstanding)}
              tone="warning"
              hint={t("financeAp.pendingApprovalHint", {
                count: summary.counts.pending_approval,
              })}
            />
            <StatCard
              label="financeAp.overdue"
              value={formatCurrency(summary.totals.overdue)}
              tone="danger"
              hint={t("financeAp.overdueHint", {
                count: summary.counts.overdue,
              })}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="financeAp.payableVsPaidTrend"
              description="financeAp.payableVsPaidHint"
              className="lg:col-span-2"
            >
              <PayableTrend summary={summary} />
            </ChartCard>

            <ChartCard title="financeAp.vouchersByStatus">
              <VoucherStatusDonut summary={summary} />
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="financeAp.payableByCategory"
              className="lg:col-span-2"
            >
              <CategoryBars summary={summary} />
            </ChartCard>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground">
                {t("financeAp.pipelineTitle")}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row
                  label="financeAp.pendingApproval"
                  value={formatNumber(summary.counts.pending_approval)}
                />
                <Row
                  label="financeAp.draftVouchers"
                  value={formatNumber(summary.counts.draft)}
                />
                <Row
                  label="financeAp.overdueVouchers"
                  value={formatNumber(summary.counts.overdue)}
                />
              </dl>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function PayableTrend({ summary }: { summary: PayableSummary }) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const data = (summary.by_month ?? []).map((month) => ({
    label: month.label,
    payable: Number(month.payable),
    paid: Number(month.paid),
  }));

  return (
    <GroupedBarsChart
      data={data}
      series={[
        {
          key: "payable",
          label: t("financeAp.seriesPayable"),
          color: colors["--accent"],
        },
        {
          key: "paid",
          label: t("financeAp.seriesPaid"),
          color: colors["--success"],
        },
      ]}
      formatValue={compactCurrency}
    />
  );
}

function VoucherStatusDonut({ summary }: { summary: PayableSummary }) {
  const { t } = useTranslation();
  const colors = useChartColors();

  const sliceColors: Record<string, string> = {
    draft: colors["--muted"],
    pending_approval: colors["--warning"],
    approved: colors["--accent"],
    partial: colors["--warning"],
    paid: colors["--success"],
    cancelled: colors["--muted"],
  };

  const slices = Object.entries(summary.vouchers_by_status ?? {})
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      label: STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status,
      value: count,
      color: sliceColors[status] ?? colors["--muted"],
    }))
    .sort((a, b) => b.value - a.value);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <DonutChart
      data={slices}
      centerValue={formatNumber(total)}
      centerLabel={t("financeAp.totalVouchers")}
    />
  );
}

function CategoryBars({ summary }: { summary: PayableSummary }) {
  const { t } = useTranslation();

  const data = (summary.by_category ?? [])
    .filter((row) => Number(row.payable) > 0)
    .map((row) => ({
      label: CATEGORY_KEYS[row.category]
        ? t(CATEGORY_KEYS[row.category])
        : row.category,
      value: Number(row.payable),
    }));

  return <BarStatChart data={data} formatValue={compactCurrency} />;
}

function Row({ label, value }: { label: MessageKey; value: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{t(label)}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
