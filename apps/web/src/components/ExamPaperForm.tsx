"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import {
  useClassRooms,
  useExams,
  useRooms,
  useSubjects,
} from "@/lib/useLookups";
import { Button, buttonClasses, Field, Select, TextInput } from "@/components/Form";
import { Card, ErrorNotice, PageHeader, Spinner } from "@/components/ui";
import type { ExamPaper } from "@/lib/types";

export function ExamPaperForm({ paper }: { paper?: ExamPaper }) {
  const router = useRouter();
  const isEdit = Boolean(paper);

  const { items: exams, loading: examsLoading } = useExams();
  const { items: classes, loading: classesLoading } = useClassRooms();
  const { items: subjects, loading: subjectsLoading } = useSubjects();
  const { items: rooms, loading: roomsLoading } = useRooms();

  const [examId, setExamId] = useState(
    paper ? String(paper.exam_id) : ""
  );
  const [classId, setClassId] = useState(
    paper ? String(paper.class_room_id) : ""
  );
  const [subjectId, setSubjectId] = useState(
    paper ? String(paper.subject_id) : ""
  );
  const [roomId, setRoomId] = useState(
    paper?.room_id ? String(paper.room_id) : ""
  );
  const [examDate, setExamDate] = useState(paper?.exam_date ?? "");
  const [startsAt, setStartsAt] = useState(paper?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(paper?.ends_at ?? "");
  const [maxMarks, setMaxMarks] = useState(
    paper ? String(paper.max_marks) : ""
  );
  const [passMarks, setPassMarks] = useState(
    paper ? String(paper.pass_marks) : ""
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const errText = (name: string) => fieldErrors[name]?.[0] ?? null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body: Record<string, unknown> = {
      exam_id: Number(examId),
      class_room_id: Number(classId),
      subject_id: Number(subjectId),
      exam_date: examDate,
      max_marks: Number(maxMarks),
      pass_marks: Number(passMarks),
      ...(roomId ? { room_id: Number(roomId) } : {}),
      ...(startsAt ? { starts_at: startsAt } : {}),
      ...(endsAt ? { ends_at: endsAt } : {}),
    };

    try {
      if (isEdit && paper) {
        await apiFetch(`/v1/exam-papers/${paper.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/v1/exam-papers", { method: "POST", body });
      }
      router.push("/dashboard/exams/papers");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors) setFieldErrors(err.errors);
      } else {
        setError("Unable to save the paper.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (examsLoading || classesLoading || subjectsLoading || roomsLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit exam paper" : "New exam paper"}
        description="Schedule a subject paper for a class."
        actions={
          <Link
            href="/dashboard/exams/papers"
            className={buttonClasses("secondary")}
          >
            Cancel
          </Link>
        }
      />

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Exam"
              htmlFor="paper_exam"
              required
              error={errText("exam_id")}
            >
              <Select
                id="paper_exam"
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
              >
                <option value="">Select exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Class"
              htmlFor="paper_class"
              required
              error={errText("class_room_id")}
            >
              <Select
                id="paper_class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Subject"
              htmlFor="paper_subject"
              required
              error={errText("subject_id")}
            >
              <Select
                id="paper_subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Room" htmlFor="paper_room" error={errText("room_id")}>
              <Select
                id="paper_room"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              >
                <option value="">Not assigned</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Exam date"
              htmlFor="paper_date"
              required
              error={errText("exam_date")}
            >
              <TextInput
                id="paper_date"
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
              />
            </Field>
            <Field label="Starts at" htmlFor="paper_start" error={errText("starts_at")}>
              <TextInput
                id="paper_start"
                type="time"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field label="Ends at" htmlFor="paper_end" error={errText("ends_at")}>
              <TextInput
                id="paper_end"
                type="time"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </Field>
            <Field
              label="Max marks"
              htmlFor="paper_max"
              required
              error={errText("max_marks")}
            >
              <TextInput
                id="paper_max"
                type="number"
                min="0"
                step="0.01"
                value={maxMarks}
                onChange={(event) => setMaxMarks(event.target.value)}
              />
            </Field>
            <Field
              label="Pass marks"
              htmlFor="paper_pass"
              required
              error={errText("pass_marks")}
            >
              <TextInput
                id="paper_pass"
                type="number"
                min="0"
                step="0.01"
                value={passMarks}
                onChange={(event) => setPassMarks(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <Link
              href="/dashboard/exams/papers"
              className={buttonClasses("secondary")}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              loading={busy}
              disabled={!examId || !classId || !subjectId || !examDate}
            >
              {isEdit ? "Save changes" : "Create paper"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
