import {
  apiFetch,
  type AttendanceRecord,
  type AttendanceSummary,
  type FeeVoucher,
  type ResultCard,
  type StudentSummary,
  type TimetableSlot,
} from "./api";

interface StudentBrief {
  id: number;
  name: string;
  admission_no: string;
  photo_url: string | null;
}

function query(studentId?: number | null): string {
  return studentId ? `?student_id=${studentId}` : "";
}

export async function fetchChildren(): Promise<StudentSummary[]> {
  const response = await apiFetch<{ data: StudentSummary[] }>("/v1/me/children");
  return response.data ?? [];
}

export async function fetchAttendance(
  studentId?: number | null
): Promise<{ student: StudentBrief; summary: AttendanceSummary; data: AttendanceRecord[] }> {
  return apiFetch(`/v1/me/attendance${query(studentId)}`);
}

export async function fetchTimetable(
  studentId?: number | null
): Promise<TimetableSlot[]> {
  const response = await apiFetch<{ data: TimetableSlot[] }>(
    `/v1/me/timetable${query(studentId)}`
  );
  return response.data ?? [];
}

export async function fetchResults(
  studentId?: number | null
): Promise<{ student: StudentBrief; data: ResultCard[] }> {
  return apiFetch(`/v1/me/results${query(studentId)}`);
}

export async function fetchFees(
  studentId?: number | null
): Promise<{
  student: StudentBrief;
  totals: { billed: string; paid: string; outstanding: string };
  data: FeeVoucher[];
}> {
  return apiFetch(`/v1/me/fees${query(studentId)}`);
}
