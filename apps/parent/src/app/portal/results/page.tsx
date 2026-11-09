"use client";

import { useState } from "react";
import { useFamily } from "@/lib/family";
import { usePortalQuery } from "@/lib/usePortalQuery";
import { classLabel, fetchResults, formatDate } from "@/lib/portal";
import { Bar, Card, EmptyState, ErrorNotice, Pill, ProgressRing, Skeleton } from "@/components/ui";
import { IconAward, IconChevronDown } from "@/components/Icons";

export default function ResultsPage() {
  const { activeChild, activeChildId, loading } = useFamily();
  const ready = !loading && activeChildId !== null;
  const { data, loading: busy, error } = usePortalQuery(activeChildId, fetchResults, ready);

  const cards = data?.data ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const active = cards.find((card) => card.exam?.id === selected) ?? cards[0] ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Results
        </h1>
        <p className="text-sm text-muted">
          Exam performance{classLabel(activeChild) ? ` - ${classLabel(activeChild)}` : ""}
        </p>
      </div>

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
          icon={<IconAward width={22} height={22} />}
        />
      ) : (
        <>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {cards.map((card) => {
              const isActive = active?.exam?.id === card.exam?.id;
              return (
                <button
                  key={card.exam?.id ?? card.exam?.name}
                  type="button"
                  onClick={() => setSelected(card.exam?.id ?? null)}
                  className={`flex min-w-[9rem] flex-col rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-transparent bg-brand text-brand-foreground shadow-[var(--shadow-soft)]"
                      : "bg-panel hover:border-brand/40"
                  }`}
                >
                  <span className={`text-xs ${isActive ? "text-white/70" : "text-muted"}`}>
                    {card.exam?.starts_on ? formatDate(card.exam.starts_on) : "Exam"}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-sm font-semibold">
                    {card.exam?.name ?? "Exam"}
                  </span>
                  <span className={`numeric mt-1 text-xs font-bold ${isActive ? "text-white" : "text-brand"}`}>
                    {Math.round(card.percentage)}%
                  </span>
                </button>
              );
            })}
          </div>

          {active ? (
            <Card>
              <div className="flex flex-col items-center gap-5 border-b pb-5 sm:flex-row sm:items-center">
                <ProgressRing
                  value={active.percentage}
                  size={120}
                  stroke={11}
                  label={
                    <div>
                      <span className="numeric block font-[family-name:var(--font-display)] text-2xl font-bold">
                        {Math.round(active.percentage)}%
                      </span>
                      <span className="block text-xs text-muted">
                        {active.grade ?? "-"}
                      </span>
                    </div>
                  }
                />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                    {active.exam?.name ?? "Result"}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {active.total_obtained} of {active.total_max} marks
                    {active.grade_points ? ` - ${active.grade_points} grade points` : ""}
                  </p>
                  <div className="mt-2 flex justify-center gap-2 sm:justify-start">
                    <Pill tone={active.failed_subjects === 0 ? "success" : "danger"}>
                      {active.failed_subjects === 0 ? "Passed" : `${active.failed_subjects} failed`}
                    </Pill>
                    <Pill tone="brand">{active.subjects.length} subjects</Pill>
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {active.subjects.map((subject) => {
                  const pct =
                    subject.max_marks > 0
                      ? ((subject.marks_obtained ?? 0) / subject.max_marks) * 100
                      : 0;
                  return (
                    <li key={subject.exam_paper_id}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold">
                          {subject.subject ?? "Subject"}
                          {subject.is_absent ? (
                            <span className="ml-2 text-xs font-normal text-[var(--danger)]">
                              absent
                            </span>
                          ) : null}
                        </span>
                        <span className="numeric shrink-0 font-semibold">
                          {subject.marks_obtained ?? "-"}
                          <span className="text-muted">/{subject.max_marks}</span>
                        </span>
                      </div>
                      <Bar
                        value={pct}
                        tone={
                          subject.passed
                            ? pct >= 75
                              ? "success"
                              : "brand"
                            : "danger"
                        }
                      />
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

      {cards.length > 1 ? (
        <p className="flex items-center justify-center gap-1 text-xs text-muted">
          <IconChevronDown width={14} height={14} className="rotate-180" />
          Tap another exam above to switch
        </p>
      ) : null}
    </div>
  );
}
