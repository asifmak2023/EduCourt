"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  useAcademicYears,
  useClassRooms,
  usePeriods,
  useSections,
  useTerms,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Checkbox, Field, Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import type { TimetableSlot } from "@/lib/types";

const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

type Mode = "me" | "class" | "teacher";

export default function TimetablePage() {
  return (
    <PermissionGate permission="timetable.view">
      <TimetableView />
    </PermissionGate>
  );
}

function TimetableView() {
  const { can } = useAuth();
  const { items: years, loading: yearsLoading } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: terms } = useTerms();
  const { items: periods } = usePeriods();
  const { items: users } = useUsers(can("user.view"));

  const currentYearId = years.find((year) => year.is_current)?.id;

  const [yearId, setYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [mode, setMode] = useState<Mode>("me");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const effectiveYear = yearId || (currentYearId ? String(currentYearId) : "");

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      if (
        effectiveYear === "" ||
        (mode === "class" && classId === "") ||
        (mode === "teacher" && teacherId === "")
      ) {
        setSlots([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.set("academic_year_id", effectiveYear);
      if (termId) query.set("term_id", termId);
      if (mode === "class" && sectionId) query.set("section_id", sectionId);

      const base =
        mode === "me"
          ? "/v1/timetable/me"
          : mode === "class"
            ? `/v1/timetable/classes/${classId}`
            : `/v1/timetable/teachers/${teacherId}`;

      try {
        const response = await apiFetch<{ data: TimetableSlot[] }>(
          `${base}?${query.toString()}`,
          { signal: controller.signal }
        );
        setSlots(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load timetable."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [effectiveYear, termId, mode, classId, sectionId, teacherId]);

  useEffect(() => load(), [load]);

  const days = useMemo(() => {
    const set = new Set(slots.map((slot) => slot.day_of_week));
    if (set.size === 0) return [1, 2, 3, 4, 5];
    return [...set].sort((a, b) => a - b);
  }, [slots]);

  const cellMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of slots) {
      map.set(`${slot.day_of_week}:${slot.period_id}`, slot);
    }
    return map;
  }, [slots]);

  const orderedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.sequence - b.sequence),
    [periods]
  );

  const filteredSections = sections.filter(
    (section) => !classId || String(section.class_room_id) === classId
  );

  const [busy, setBusy] = useState(false);
  const [genDays, setGenDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [genReplace, setGenReplace] = useState(false);
  const [genDryRun, setGenDryRun] = useState(true);

  const setPublished = async (published: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);

    const body: Record<string, unknown> = {
      academic_year_id: Number(effectiveYear),
    };
    if (termId) body.term_id = Number(termId);
    if (mode === "class" && classId) body.class_room_id = Number(classId);

    try {
      const result = await apiFetch<{ updated: number }>(
        `/v1/timetable-slots/${published ? "publish" : "unpublish"}`,
        { method: "POST", body }
      );
      setNotice(
        `${published ? "Published" : "Unpublished"} ${result.updated} slot(s).`
      );
      load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    const body: Record<string, unknown> = {
      academic_year_id: Number(effectiveYear),
      days: genDays,
      replace: genReplace,
      dry_run: genDryRun,
    };
    if (termId) body.term_id = Number(termId);
    if (mode === "class" && classId) body.class_room_id = Number(classId);

    try {
      const result = await apiFetch<{
        data: { created: number; removed: number };
      }>("/v1/timetable/generate", { method: "POST", body });

      setNotice(
        `${genDryRun ? "Dry run: " : ""}would place ${result.data.created} and remove ${result.data.removed} slot(s).`
      );

      if (!genDryRun) load();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  if (yearsLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="Weekly schedule by class, teacher or your own."
        actions={
          can("academic.edit") ? (
            <Link
              href="/dashboard/timetable/slots"
              className={buttonClasses("secondary")}
            >
              Manage slots
            </Link>
          ) : null
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Academic year" htmlFor="tt_year" required>
            <Select
              id="tt_year"
              value={effectiveYear}
              onChange={(event) => setYearId(event.target.value)}
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Term" htmlFor="tt_term">
            <Select
              id="tt_term"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
            >
              <option value="">Whole year</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="View" htmlFor="tt_mode">
            <Select
              id="tt_mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
            >
              <option value="me">My timetable</option>
              <option value="class">By class</option>
              {can("user.view") ? (
                <option value="teacher">By teacher</option>
              ) : null}
            </Select>
          </Field>
          {mode === "class" ? (
            <Field label="Class" htmlFor="tt_class" required>
              <Select
                id="tt_class"
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value);
                  setSectionId("");
                }}
              >
                <option value="">Select class</option>
                {classes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {mode === "class" ? (
            <Field label="Section" htmlFor="tt_section">
              <Select
                id="tt_section"
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
              >
                <option value="">All sections</option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {mode === "teacher" ? (
            <Field label="Teacher" htmlFor="tt_teacher" required>
              <Select
                id="tt_teacher"
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
              >
                <option value="">Select teacher</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      </Card>

      {notice ? <SuccessNotice message={notice} /> : null}
      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Weekly grid</h2>
          {can("timetable.approve") && mode === "class" && classId ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                loading={busy}
                onClick={() => setPublished(true)}
              >
                Publish
              </Button>
              <Button
                variant="secondary"
                type="button"
                loading={busy}
                onClick={() => setPublished(false)}
              >
                Unpublish
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Spinner />
        ) : slots.length === 0 ? (
          <EmptyState message="No timetable slots for this selection." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-100 px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-500">
                    Period
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="border-b border-slate-100 px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-500"
                    >
                      {DAY_NAMES[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orderedPeriods.map((period) => (
                  <tr key={period.id}>
                    <td className="border-b border-slate-100 px-3 py-2 align-top">
                      <div className="font-medium text-slate-700">
                        {period.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {period.starts_at} - {period.ends_at}
                      </div>
                    </td>
                    {days.map((day) => {
                      const slot = cellMap.get(`${day}:${period.id}`);
                      return (
                        <td
                          key={`${day}:${period.id}`}
                          className="min-w-[9rem] border-b border-slate-100 px-3 py-2 align-top"
                        >
                          {slot ? (
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">
                                {slot.subject?.code ?? slot.subject?.name ?? "-"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {slot.teacher?.name ?? "Unassigned"}
                              </div>
                              {slot.room ? (
                                <div className="text-xs text-slate-400">
                                  {slot.room.name}
                                </div>
                              ) : null}
                              {!slot.is_published ? (
                                <Badge value="draft" />
                              ) : null}
                            </div>
                          ) : period.is_break ? (
                            <span className="text-xs text-slate-300">Break</span>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {can("timetable.create") ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Generate timetable
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {mode === "class" && classId
                  ? "Generate for the selected class."
                  : "Generate for every class in the year."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {[1, 2, 3, 4, 5].map((day) => (
                <Checkbox
                  key={day}
                  label={DAY_NAMES[day].slice(0, 3)}
                  checked={genDays.includes(day)}
                  onChange={(event) =>
                    setGenDays((current) =>
                      event.target.checked
                        ? [...current, day].sort((a, b) => a - b)
                        : current.filter((value) => value !== day)
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Checkbox
              label="Dry run"
              checked={genDryRun}
              onChange={(event) => setGenDryRun(event.target.checked)}
            />
            <Checkbox
              label="Replace existing"
              checked={genReplace}
              onChange={(event) => setGenReplace(event.target.checked)}
            />
            <Button
              type="button"
              loading={busy}
              disabled={genDays.length === 0}
              onClick={generate}
            >
              Generate
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
