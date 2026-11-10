import { apiFetch } from "./api";
import type {
  AttendanceRecord,
  Child,
  PortalAttendance,
  PortalFees,
  PortalResults,
  PortalWhatsAppConsentState,
  PortalWhatsAppMessage,
  TimetableSlot,
} from "./types";

function studentQuery(studentId?: number | null): string {
  return studentId ? `?student_id=${studentId}` : "";
}

function rangeQuery(
  studentId?: number | null,
  range?: { from?: string; to?: string }
): string {
  const params = new URLSearchParams();

  if (studentId) {
    params.set("student_id", String(studentId));
  }
  if (range?.from) {
    params.set("from", range.from);
  }
  if (range?.to) {
    params.set("to", range.to);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function rollingYearRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 364 * 24 * 60 * 60 * 1000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  return { from: iso(from), to: iso(to) };
}

export function formatMoney(value: number | string | null | undefined): string {
  return `Rs ${formatRupees(value)}`;
}

export function formatRupees(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function formatDateLong(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

export function childName(child: Child | null | undefined): string {
  if (!child) {
    return "";
  }
  return (
    child.full_name ??
    [child.first_name, child.last_name].filter(Boolean).join(" ")
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function currentEnrollment(child: Child | null | undefined) {
  if (!child?.enrollments?.length) {
    return null;
  }
  return [...child.enrollments].sort((a, b) => b.id - a.id)[0] ?? null;
}

export function classLabel(child: Child | null | undefined): string {
  const enrollment = currentEnrollment(child);
  const room = enrollment?.class_room?.name;
  const section = enrollment?.section?.name;

  if (!room && !section) {
    return "";
  }
  return [room, section && `Section ${section}`].filter(Boolean).join(" - ");
}

export async function fetchChildren(): Promise<Child[]> {
  const response = await apiFetch<{ data: Child[] }>("/v1/me/children");
  return response.data;
}

export async function fetchAttendance(
  studentId?: number | null,
  range?: { from?: string; to?: string }
): Promise<PortalAttendance> {
  return apiFetch<PortalAttendance>(
    `/v1/me/attendance${rangeQuery(studentId, range)}`
  );
}

export function fetchAttendanceYear(
  studentId?: number | null
): Promise<PortalAttendance> {
  return fetchAttendance(studentId, rollingYearRange());
}

export async function fetchTimetable(
  studentId?: number | null
): Promise<TimetableSlot[]> {
  const response = await apiFetch<{ data: TimetableSlot[] }>(
    `/v1/me/timetable${studentQuery(studentId)}`
  );
  return response.data;
}

export async function fetchResults(
  studentId?: number | null
): Promise<PortalResults> {
  return apiFetch<PortalResults>(`/v1/me/results${studentQuery(studentId)}`);
}

export async function fetchFees(
  studentId?: number | null
): Promise<PortalFees> {
  return apiFetch<PortalFees>(`/v1/me/fees${studentQuery(studentId)}`);
}

export async function fetchWhatsAppConsent(): Promise<PortalWhatsAppConsentState> {
  const response = await apiFetch<{ data: PortalWhatsAppConsentState }>(
    "/v1/me/whatsapp/consent"
  );
  return response.data;
}

export async function updateWhatsAppConsent(
  status: "opted_in" | "opted_out",
  category = "utility"
): Promise<PortalWhatsAppConsentState> {
  const response = await apiFetch<{ data: PortalWhatsAppConsentState }>(
    "/v1/me/whatsapp/consent",
    { method: "PUT", body: { status, category } }
  );
  return response.data;
}

export async function fetchWhatsAppMessages(): Promise<PortalWhatsAppMessage[]> {
  const response = await apiFetch<{ data: PortalWhatsAppMessage[] }>(
    "/v1/me/whatsapp/messages"
  );
  return response.data;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function attendanceRate(summary?: {
  present: number;
  marked: number;
}): number {
  if (!summary || summary.marked === 0) {
    return 0;
  }
  return Math.round((summary.present / summary.marked) * 100);
}

export function attendanceTone(
  status: string
): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "present":
      return "success";
    case "late":
      return "warning";
    case "absent":
      return "danger";
    default:
      return "muted";
  }
}

export function voucherTone(
  status: string
): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "paid":
      return "success";
    case "partial":
      return "warning";
    case "unpaid":
      return "danger";
    default:
      return "muted";
  }
}

/** Letter grade from a percentage, matching a simple 90/80/70… ladder. */
export function gradeLetter(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

/** One-letter attendance code used in the register heatmap. */
export function attendanceCode(status: string): string {
  switch (status) {
    case "present":
      return "P";
    case "late":
      return "L";
    case "absent":
      return "A";
    case "leave":
    case "excused":
      return "LV";
    default:
      return "—";
  }
}

/** Short period label: "Period 5" -> "P5", "P5" stays "P5". */
export function periodShort(name?: string | null): string {
  if (!name) {
    return "—";
  }
  const digits = name.match(/\d+/);
  if (digits) {
    return `P${digits[0]}`;
  }
  return name.length > 6 ? name.slice(0, 6) : name;
}

export function todaySlots(slots: TimetableSlot[], now = new Date()): TimetableSlot[] {
  return slots
    .filter((slot) => slot.day_of_week === now.getDay())
    .sort(
      (a, b) =>
        (a.period?.id ?? 0) - (b.period?.id ?? 0)
    );
}

export type { AttendanceRecord };
