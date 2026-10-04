import { apiFetch } from "./api";

export interface PortalStudent {
  id: number;
  admission_no?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  photo_url?: string | null;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  leave: number;
  absent: number;
  excused: number;
  marked: number;
}

export interface AttendanceRecord {
  id: number;
  attendance_date: string;
  status: string;
  status_label?: string;
  remarks?: string | null;
}

export interface PortalAttendance {
  student: PortalStudent | null;
  summary: AttendanceSummary;
  data: AttendanceRecord[];
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period?: { name?: string; starts_at?: string; ends_at?: string } | null;
  subject?: { name?: string } | null;
  teacher?: { name?: string } | null;
  room?: { name?: string } | null;
  section?: { name?: string } | null;
}

export interface ResultSubject {
  subject?: string | null;
  max_marks: number;
  pass_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks?: string | null;
  passed: boolean;
}

export interface ResultCard {
  exam?: { id: number; name: string; starts_on?: string; ends_on?: string } | null;
  subjects: ResultSubject[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade?: string | null;
  failed_subjects: number;
  result: string;
}

export interface PortalResults {
  student: PortalStudent | null;
  data: ResultCard[];
}

export interface FeeVoucher {
  id: number;
  voucher_no: string;
  due_date?: string | null;
  amount: number | string;
  paid_amount: number | string;
  balance: number | string;
  status: string;
}

export interface PortalFees {
  student: PortalStudent | null;
  totals: { billed: string; paid: string; outstanding: string };
  data: FeeVoucher[];
}

function studentQuery(studentId?: number | null): string {
  return studentId ? `?student_id=${studentId}` : "";
}

export function formatMoney(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `PKR ${safe.toLocaleString("en-PK")}`;
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function studentName(student: PortalStudent | null | undefined): string {
  if (!student) {
    return "";
  }
  return (
    student.full_name ??
    [student.first_name, student.last_name].filter(Boolean).join(" ")
  );
}

export async function fetchChildren(): Promise<PortalStudent[]> {
  const response = await apiFetch<{ data: PortalStudent[] }>("/v1/me/children");
  return response.data;
}

export async function fetchAttendance(
  studentId?: number | null
): Promise<PortalAttendance> {
  return apiFetch<PortalAttendance>(
    `/v1/me/attendance${studentQuery(studentId)}`
  );
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

export async function fetchFees(studentId?: number | null): Promise<PortalFees> {
  return apiFetch<PortalFees>(`/v1/me/fees${studentQuery(studentId)}`);
}
