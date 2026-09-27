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
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string | null;
  status: string | null;
  date_of_birth: string | null;
  guardian_name?: string | null;
  phone?: string | null;
}

export interface Guardian {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  occupation: string | null;
  relationship?: string | null;
  is_primary?: boolean | null;
  is_emergency_contact?: boolean | null;
}

export interface Enrollment {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  section_id: number | null;
  roll_number: string | null;
  status: string | null;
  starts_on: string | null;
  ends_on: string | null;
  academic_year?: { id: number; name: string } | null;
  class_room?: { id: number; name: string } | null;
  section?: { id: number; name: string } | null;
}

export interface StudentDetail extends Student {
  institution_id: number;
  campus_id: number;
  national_id: string | null;
  blood_group: string | null;
  nationality: string | null;
  religion: string | null;
  category: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  previous_school: string | null;
  admission_date: string | null;
  notes: string | null;
  guardians: Guardian[];
  enrollments: Enrollment[];
}

export interface Admission {
  id: number;
  application_no: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string | null;
  status: string | null;
  status_label: string | null;
  class_room: string | null;
  academic_year: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  applied_on: string | null;
  documents_count?: number;
}

export interface AdmissionDetail extends Admission {
  institution_id: number;
  campus_id: number;
  date_of_birth: string | null;
  class_room_id: number | null;
  academic_year_id: number | null;
  guardian_email: string | null;
  guardian_relation: string | null;
  previous_school: string | null;
  address: string | null;
  city: string | null;
  decided_on: string | null;
  decided_by: string | null;
  rejection_reason: string | null;
  student_id: number | null;
  notes: string | null;
}

export interface AcademicYearOption {
  id: number;
  name: string;
  code: string | null;
  status: string | null;
  is_current: boolean;
}

export interface ClassRoomOption {
  id: number;
  name: string;
  code: string | null;
  stage_id: number | null;
}

export interface SectionOption {
  id: number;
  class_room_id: number;
  name: string;
}

export interface AcademicOptions {
  academic_years: AcademicYearOption[];
  class_rooms: ClassRoomOption[];
  sections: SectionOption[];
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
