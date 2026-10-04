"use client";

import { useTranslation } from "@eis/i18n";
import { usePortal } from "@/lib/portal-context";
import { usePortalQuery } from "@/lib/portal-hooks";
import { fetchResults } from "@/lib/portal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";

export default function PortalResultsPage() {
  const { t } = useTranslation();
  const { activeStudentId, loading } = usePortal();
  const { data, loading: queryLoading, error } = usePortalQuery(
    activeStudentId,
    fetchResults,
    !loading
  );

  const cards = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="portal.results.title"
        description="portal.results.subtitle"
      />

      {error ? <ErrorNotice message={error} /> : null}

      {loading || queryLoading ? (
        <Spinner />
      ) : cards.length === 0 ? (
        <EmptyState message="portal.results.empty" />
      ) : (
        <div className="space-y-6">
          {cards.map((card, cardIndex) => (
            <Card key={card.exam?.id ?? `result-${cardIndex}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {card.exam?.name ?? t("portal.results.title")}
                  </h2>
                  {card.exam?.starts_on ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {card.exam.starts_on}
                      {card.exam.ends_on ? ` - ${card.exam.ends_on}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {card.percentage}%
                  </span>
                  {card.grade ? <Badge value={card.grade} /> : null}
                  <Badge value={card.result} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted">
                      <th className="px-6 py-2 text-start font-medium">
                        {t("portal.results.subject")}
                      </th>
                      <th className="px-6 py-2 text-end font-medium">
                        {t("portal.results.marks")}
                      </th>
                      <th className="px-6 py-2 text-end font-medium">
                        {t("portal.results.result")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {card.subjects.map((subject, index) => (
                      <tr key={`${subject.subject}-${index}`}>
                        <td className="px-6 py-2.5 text-foreground">
                          {subject.subject ?? "-"}
                        </td>
                        <td className="px-6 py-2.5 text-end text-foreground">
                          {subject.is_absent
                            ? t("portal.results.absent")
                            : `${subject.marks_obtained ?? "-"} / ${subject.max_marks}`}
                        </td>
                        <td className="px-6 py-2.5 text-end">
                          <Badge
                            value={
                              subject.passed
                                ? t("portal.results.passed")
                                : t("portal.results.failed")
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 border-t border-border px-6 py-3 text-sm">
                <span className="text-muted">
                  {t("portal.results.total")}:{" "}
                  <span className="font-medium text-foreground">
                    {card.total_obtained} / {card.total_max}
                  </span>
                </span>
                <span className="text-muted">
                  {t("portal.results.percentage")}:{" "}
                  <span className="font-medium text-foreground">
                    {card.percentage}%
                  </span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
