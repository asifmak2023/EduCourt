export interface PortfolioUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  roles: string[];
  institution_id: number | null;
  campus_id: number | null;
  two_factor_enabled: boolean;
  photo_url?: string | null;
  campus?: { id: number; name: string } | null;
  institution?: { id: number; name: string } | null;
}

export interface AcademicYear {
  id: number;
  name: string;
  starts_on?: string | null;
  ends_on?: string | null;
}

export interface ClassRoom {
  id: number;
  name: string;
  code?: string | null;
}

export interface Section {
  id: number;
  name: string;
}

export interface Enrollment {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  section_id?: number | null;
  roll_number?: string | null;
  status?: string | null;
  academic_year?: AcademicYear | null;
  class_room?: ClassRoom | null;
  section?: Section | null;
}

export interface Child {
  id: number;
  admission_no?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: string | null;
  status?: string | null;
  photo_url?: string | null;
  enrollments?: Enrollment[];
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
  class_room?: string | null;
  section?: string | null;
}

export interface PortalAttendance {
  student: { id: number; name: string; admission_no: string; photo_url: string | null } | null;
  summary: AttendanceSummary;
  data: AttendanceRecord[];
}

export interface Period {
  id: number;
  name?: string;
  starts_at?: string;
  ends_at?: string;
  is_break?: boolean;
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period?: Period | null;
  subject?: { id: number; name?: string; code?: string | null } | null;
  teacher?: { id: number; name?: string } | null;
  room?: { id: number; name?: string } | null;
  section?: { id: number; name?: string } | null;
  class_room?: { id: number; name?: string } | null;
}

export interface ResultSubject {
  exam_paper_id: number;
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
  grade_points?: number | null;
  failed_subjects: number;
  result: string;
}

export interface PortalResults {
  student: { id: number; name: string; admission_no: string; photo_url: string | null } | null;
  data: ResultCard[];
}

export interface FeeVoucher {
  id: number;
  voucher_no: string;
  due_date?: string | null;
  gross_amount: number | string;
  discount_amount: number | string;
  amount: number | string;
  paid_amount: number | string;
  balance: number | string;
  late_fee_amount?: number | string;
  status: string;
  issued_at?: string | null;
}

export interface PortalFees {
  student: { id: number; name: string; admission_no: string; photo_url: string | null } | null;
  totals: { billed: string; paid: string; outstanding: string };
  data: FeeVoucher[];
}
