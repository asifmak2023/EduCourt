"use client";

import { useState } from "react";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import { classLabel, fetchResults, formatDate, gradeLetter } from "@/lib/portal";
import { Card, EmptyState, ErrorNotice, PageTitle, Pill, Skeleton } from "@/components/ui";
import { IconCap } from "@/components/Icons";

export default function ResultsPage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(activeChildId, fetchResults, ready);

  const cards = data?.data ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const active = cards.find((card) => card.exam?.id === selected) ?? cards[0] ?? null;

  return (
    <div className="space-y-5">
      <PageTitle
        eyebrow={classLabel(activeChild) ? `Report card · ${classLabel(activeChild)}` : "Report card"}
        title="Results"
      />

      {busy ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        <ErrorNotice message={error} />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No results published yet"
          message="When your school publishes an exam result, it appears here."
          icon={<IconCap width={22} height={22} />}
        />
      ) : (
        <>
          {/* exam picker */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {cards.map((card) => {
              const isActive = active?.exam?.id === card.exam?.id;
              return (
                <button
                  key={card.exam?.id ?? card.exam?.name}
                  type="button"
                  onClick={() => setSelected(card.exam?.id ?? null)}
                  className={`flex min-w-[9.5rem] flex-col rounded-lg border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-transparent bg-sidebar text-board-ink"
                      : "border-hairline bg-card hover:border-[color-mix(in_srgb,var(--primary)_40%,transparent)]"
                  }`}
                >
                  <span className={`text-xs ${isActive ? "text-board-dim" : "text-muted"}`}>
                    {card.exam?.starts_on ? formatDate(card.exam.starts_on) : "Exam"}
                  </span>
                  <span
                    className={`mt-0.5 line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold uppercase leading-tight ${
                      isActive ? "text-board-ink" : "text-foreground"
                    }`}
                  >
                    {card.exam?.name ?? "Exam"}
                  </span>
                  <span
                    className={`numeric mt-1 text-xs font-bold ${
                      isActive ? "text-marigold" : "text-primary"
                    }`}
                  >
                    {Math.round(card.percentage)}%
                  </span>
                </button>
              );
            })}
          </div>

          {active ? (
            <Card>
              {/* header: stamp grade + totals */}
              <div className="flex flex-col items-center gap-5 border-b border-hairline pb-5 sm:flex-row sm:items-center">
                <span className="grid h-28 w-28 shrink-0 -rotate-6 place-items-center rounded-full border-[3px] border-[var(--redpen)] text-center">
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-4xl font-bold leading-none text-[var(--redpen)]">
                      {active.grade ?? gradeLetter(active.percentage)}
                    </span>
                    <span className="numeric mt-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--redpen)]/70">
                      grade
                    </span>
                  </span>
                </span>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-none text-foreground">
                    {active.exam?.name ?? "Result"}
                  </h2>
                  <p className="mt-1.5 numeric text-sm text-muted">
                    {active.total_obtained} of {active.total_max} marks ·{" "}
                    <span className="font-semibold text-foreground">
                      {Math.round(active.percentage)}%
                    </span>
                    {active.grade_points ? ` · ${active.grade_points} grade points` : ""}
                  </p>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Pill tone={active.failed_subjects === 0 ? "success" : "danger"}>
                      {active.failed_subjects === 0 ? "Passed" : `${active.failed_subjects} failed`}
                    </Pill>
                    <Pill tone="brand">{active.subjects.length} subjects</Pill>
                  </div>
                </div>
              </div>

              {/* subject marks on ruled paper */}
              <ul className="mt-4 space-y-4">
                {active.subjects.map((subject) => {
                  const pct =
                    subject.max_marks > 0
                      ? ((subject.marks_obtained ?? 0) / subject.max_marks) * 100
                      : 0;
                  const tone = !subject.passed
                    ? "var(--danger)"
                    : pct >= 75
                      ? "var(--success)"
                      : "var(--primary)";
                  return (
                    <li key={subject.exam_paper_id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-[family-name:var(--font-display)] text-base font-semibold uppercase tracking-wide text-foreground">
                          {subject.subject ?? "Subject"}
                          {subject.is_absent ? (
                            <span className="ml-2 text-xs font-normal normal-case text-[var(--danger)]">
                              absent
                            </span>
                          ) : null}
                        </span>
                        <span className="numeric shrink-0 text-sm font-semibold text-foreground">
                          {subject.marks_obtained ?? "-"}
                          <span className="text-muted">/{subject.max_marks}</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, pct))}%`,
                            backgroundColor: tone,
                          }}
                        />
                      </div>
                      {subject.remarks ? (
                        <p className="mt-1 text-xs text-muted">{subject.remarks}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
