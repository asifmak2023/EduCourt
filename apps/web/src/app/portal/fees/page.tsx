"use client";

import { useTranslation } from "@eis/i18n";
import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import { fetchFees, formatDate, formatMoney } from "@/lib/portal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";

export default function PortalFeesPage() {
  const { t } = useTranslation();
  const { activeStudentId, loading } = usePortal();
  const { data, loading: queryLoading, error } = usePortalQuery(
    activeStudentId,
    fetchFees,
    !loading
  );

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <PageHeader title="portal.fees.title" description="portal.fees.subtitle" />

      {error ? <ErrorNotice message={error} /> : null}

      {loading || queryLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="portal.fees.billed"
              value={formatMoney(totals?.billed)}
            />
            <StatCard
              label="portal.fees.paid"
              value={formatMoney(totals?.paid)}
              tone="positive"
            />
            <StatCard
              label="portal.fees.outstanding"
              value={formatMoney(totals?.outstanding)}
              tone={Number(totals?.outstanding ?? 0) > 0 ? "danger" : "positive"}
            />
          </div>

          {data && data.data.length > 0 ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-6 py-3 text-start font-medium">
                      {t("portal.fees.voucher")}
                    </th>
                    <th className="px-6 py-3 text-start font-medium">
                      {t("portal.fees.dueDate")}
                    </th>
                    <th className="px-6 py-3 text-end font-medium">
                      {t("portal.fees.amount")}
                    </th>
                    <th className="px-6 py-3 text-end font-medium">
                      {t("portal.fees.balance")}
                    </th>
                    <th className="px-6 py-3 text-end font-medium">
                      {t("portal.fees.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.data.map((voucher) => (
                    <tr key={voucher.id}>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {voucher.voucher_no}
                      </td>
                      <td className="px-6 py-3 text-muted">
                        {formatDate(voucher.due_date)}
                      </td>
                      <td className="px-6 py-3 text-end text-foreground">
                        {formatMoney(voucher.amount)}
                      </td>
                      <td className="px-6 py-3 text-end text-foreground">
                        {formatMoney(voucher.balance)}
                      </td>
                      <td className="px-6 py-3 text-end">
                        <Badge value={voucher.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <EmptyState message="portal.fees.empty" />
          )}
        </>
      )}
    </div>
  );
}
