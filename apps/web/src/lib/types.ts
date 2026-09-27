export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

export interface Institution {
  id: number;
  name: string;
  code?: string | null;
}

export interface Campus {
  id: number;
  name: string;
  code?: string | null;
}

export interface Student {
  id: number;
  admission_no: string;
  full_name: string;
  gender: string | null;
  status: string | null;
  date_of_birth: string | null;
  guardian_name?: string | null;
  phone?: string | null;
}

export interface Admission {
  id: number;
  application_no: string;
  full_name: string;
  gender: string | null;
  status: string | null;
  status_label: string | null;
  class_room: string | null;
  academic_year: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  applied_on: string | null;
}

export interface FeeVoucher {
  id: number;
  voucher_no: string;
  status: string | null;
  amount: string;
  paid_amount: string;
  balance: string;
  due_date: string | null;
  student?: Student | null;
}

export interface GenderedCount {
  gender: string | null;
  total: number;
}

export interface CampusDashboard {
  as_on: string;
  students_active: number;
  students_by_gender: GenderedCount[];
  staff_employed: number;
  enrollments_active: number;
  admissions_pending: number;
  unpaid_vouchers: number;
  outstanding_fees: number;
  fees_collected_this_month: number;
  scholarships_active: number;
  exams_scheduled: number;
  leave_pending: number;
  conduct_open: number;
  payroll_draft_runs: number;
  upcoming_events: number;
}

export interface PlatformOverview {
  totals: {
    institutions: number;
    campuses: number;
    students: number;
    staff: number;
    active_enrollments: number;
  };
  institutions: {
    id: number;
    name: string;
    code: string | null;
    campuses: number;
    students: number;
    staff: number;
  }[];
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period?: { id: number; name?: string | null; starts_at?: string | null; ends_at?: string | null } | null;
  subject?: { id: number; name?: string | null } | null;
  class_room?: { id: number; name?: string | null } | null;
  section?: { id: number; name?: string | null } | null;
  room?: { id: number; name?: string | null } | null;
}
