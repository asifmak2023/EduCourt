"use client";

import {
  ReportDocument,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { formatNumber } from "@/lib/format";
import type { ClassRoom, Exam, ResultCard, Student } from "@/lib/types";

export function ResultCardDocument({
  card,
  student,
  exam,
  classRoom,
}: {
  card: ResultCard;
  student?: Student | null;
  exam?: Exam | null;
  classRoom?: ClassRoom | null;
}) {
  const title = "Result Card";
  const subtitle = student
    ? `${student.full_name} (${student.admission_no})`
    : `Student #${card.student_id}`;
  const scopeParts = [
    exam?.name ?? `Exam #${card.exam_id}`,
    classRoom?.name ?? (card.class_room_id ? `Class #${card.class_room_id}` : null),
  ].filter((entry): entry is string => Boolean(entry));

  const rows = card.subjects.map((subject) => [
    subject.subject ?? `Subject #${subject.subject_id}`,
    formatNumber(subject.max_marks),
    formatNumber(subject.pass_marks),
    subject.is_absent
      ? "Absent"
      : subject.marks_obtained === null
        ? "Not graded"
        : formatNumber(subject.marks_obtained),
    subject.is_absent
      ? "Absent"
      : subject.marks_obtained === null
        ? "-"
        : subject.passed
          ? "Pass"
          : "Fail",
    subject.remarks ?? "-",
  ]);

  return (
    <ReportDocument
      title={title}
      subtitle={subtitle}
      scope={scopeParts.join(" - ")}
      footerNote="Student result card - confidential"
    >
      <ReportStatGrid
        items={[
          { label: "Result", value: card.result.toUpperCase() },
          {
            label: "Total",
            value: `${formatNumber(card.total_obtained)} / ${formatNumber(card.total_max)}`,
          },
          { label: "Percentage", value: `${card.percentage}%` },
          { label: "Grade", value: card.grade ?? "-" },
          { label: "Grade points", value: card.grade_points ?? "-" },
          { label: "Failed subjects", value: formatNumber(card.failed_subjects) },
        ]}
      />

      <ReportSection
        title="Subject results"
        description="Marks, pass status and remarks for each scheduled paper."
      >
        <ReportTable
          columns={["Subject", "Max", "Pass", "Obtained", "Status", "Remarks"]}
          align={["left", "right", "right", "right", "left", "left"]}
          empty="No subjects are scheduled for this exam."
          rows={rows}
          totalRow={[
            "Total",
            formatNumber(card.total_max),
            "-",
            formatNumber(card.total_obtained),
            card.result.toUpperCase(),
            "",
          ]}
        />
      </ReportSection>

      <div className="mt-10 grid grid-cols-3 gap-8 text-center text-[11px] text-black/70">
        <div className="border-t border-black/40 pt-1">Class Teacher</div>
        <div className="border-t border-black/40 pt-1">Principal</div>
        <div className="border-t border-black/40 pt-1">Parent / Guardian</div>
      </div>
    </ReportDocument>
  );
}
