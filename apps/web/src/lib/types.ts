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
  code: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  is_active?: boolean;
  campuses_count?: number;
  created_at?: string;
}

export interface Campus {
  id: number;
  institution_id?: number;
  name: string;
  code: string | null;
  type?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  address?: string | null;
  is_active?: boolean;
  institution?: Institution;
  created_at?: string;
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
  photo_path?: string | null;
  photo_url?: string | null;
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

export interface FeeHead {
  id: number;
  code: string | null;
  name: string;
  income_account_id?: number | null;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
  income_account?: ChartOfAccount | null;
}

export interface FeePlanItem {
  id?: number;
  fee_head_id: number;
  amount: string | number;
  is_optional: boolean;
  sort_order?: number | null;
  fee_head?: FeeHead | null;
}

export interface FeeInstallment {
  id?: number;
  sequence?: number | null;
  label: string;
  due_date: string;
  percentage: string | number;
}

export interface FeePlan {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  late_fee_type: string | null;
  late_fee_amount: string | null;
  late_fee_grace_days: number | null;
  academic_year?: AcademicYear | null;
  class_room?: ClassRoom | null;
  items?: FeePlanItem[];
  installments?: FeeInstallment[];
  totals?: {
    required: string;
    optional: string;
    grand: string;
  };
}

export interface ReceivableRow {
  student_id: number;
  student: string | null;
  admission_no: string | null;
  class_room_id: number | null;
  class: string | null;
  section: string | null;
  vouchers: number;
  outstanding: string;
  oldest_due_date: string | null;
  max_days_overdue: number;
  bucket: string;
}

export interface ReceivableReport {
  as_of: string;
  summary: {
    students: number;
    vouchers: number;
    outstanding: string;
    buckets: {
      current: string;
      days_1_30: string;
      days_31_60: string;
      days_61_90: string;
      days_over_90: string;
    };
  };
  data: ReceivableRow[];
}

export interface FeeVoucherLine {
  id: number;
  fee_head_id: number;
  amount: string;
  discount_amount: string;
  net_amount: string;
  fee_head?: FeeHead | null;
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

export interface FeeVoucherDetail extends FeeVoucher {
  institution_id: number;
  campus_id: number;
  student_id: number;
  academic_year_id: number | null;
  fee_plan_id: number | null;
  fee_installment_id: number | null;
  sequence: number | null;
  gross_amount: string;
  discount_amount: string;
  late_fee_amount: string | null;
  late_fee_applied_at: string | null;
  issued_at: string | null;
  journal_entry_id: number | null;
  lines: FeeVoucherLine[];
  payments: FeePayment[];
}

export interface FeePayment {
  id: number;
  student_id: number;
  fee_voucher_id: number | null;
  receipt_no: string;
  payment_date: string | null;
  amount: string;
  method: string | null;
  reference: string | null;
  status: string | null;
  notes: string | null;
  student?: Student | null;
  voucher?: FeeVoucherDetail | null;
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

export interface ChartOfAccount {
  id: number;
  parent_id: number | null;
  code: string;
  name: string;
  account_type: string | null;
  normal_balance: string | null;
  is_group: boolean;
  is_active: boolean;
  description: string | null;
  children?: ChartOfAccount[];
}

export interface JournalLine {
  id: number;
  chart_of_account_id: number;
  line_no: number;
  description: string | null;
  debit: string;
  credit: string;
  account?: ChartOfAccount | null;
}

export interface JournalEntry {
  id: number;
  fiscal_year_id: number;
  reference: string;
  entry_date: string | null;
  status: string | null;
  memo: string | null;
  total_debit: string;
  total_credit: string;
  posted_at: string | null;
  reversed_by_id: number | null;
  reversal_of_id: number | null;
  fiscal_year?: FiscalYear | null;
  lines?: JournalLine[];
}

export interface FiscalYear {
  id: number;
  name: string;
  code: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
  is_current: boolean;
}

export interface TrialBalanceRow {
  chart_of_account_id: number;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  total_debit: string;
  total_credit: string;
  balance: string;
}

export interface AccountLedgerRow {
  journal_entry_id: number;
  reference: string;
  entry_date: string | null;
  description: string | null;
  debit: string;
  credit: string;
  running_balance: string;
}

export interface AccountLedger {
  account: {
    id: number;
    code: string;
    name: string;
    account_type: string | null;
    normal_balance: string | null;
  };
  data: AccountLedgerRow[];
  closing_balance: string;
}

export interface ExpenseCategory {
  id: number;
  expense_account_id: number | null;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  expense_account?: ChartOfAccount | null;
}

export interface Vendor {
  id: number;
  payable_account_id: number | null;
  code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  payable_account?: ChartOfAccount | null;
}

export interface ExpenseLine {
  id: number;
  expense_category_id: number;
  amount: string;
  description: string | null;
  category?: ExpenseCategory | null;
}

export interface ExpensePayment {
  id: number;
  expense_id: number;
  reference: string;
  payment_date: string | null;
  amount: string;
  method: string | null;
  method_label: string | null;
  notes: string | null;
  voided_at: string | null;
  is_voided: boolean;
  expense?: Expense | null;
}

export interface Expense {
  id: number;
  fiscal_year_id: number;
  vendor_id: number | null;
  reference: string;
  expense_date: string | null;
  status: string | null;
  status_label: string | null;
  payee_name: string | null;
  bill_no: string | null;
  memo: string | null;
  total: string;
  paid_amount: string;
  outstanding: string;
  approved_at: string | null;
  journal_entry_id: number | null;
  vendor?: Vendor | null;
  fiscal_year?: FiscalYear | null;
  lines?: ExpenseLine[];
  payments?: ExpensePayment[];
}

export interface BudgetLine {
  id: number;
  chart_of_account_id: number;
  amount: string;
  notes: string | null;
  account?: ChartOfAccount | null;
}

export interface Budget {
  id: number;
  fiscal_year_id: number;
  name: string;
  period_type: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: string | null;
  notes: string | null;
  approved_at: string | null;
  fiscal_year?: FiscalYear | null;
  lines?: BudgetLine[];
  total_budget: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  code: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string | null;
  is_current: boolean;
  notes: string | null;
  terms?: Term[];
}

export interface Term {
  id: number;
  academic_year_id: number;
  name: string;
  sequence: number;
  starts_on: string | null;
  ends_on: string | null;
  is_current: boolean;
  academic_year?: AcademicYear | null;
}

export interface Stage {
  id: number;
  name: string;
  code: string;
  sequence: number;
  is_active: boolean;
}

export interface ClassRoom {
  id: number;
  stage_id: number;
  name: string;
  code: string;
  sequence: number;
  capacity: number | null;
  room: string | null;
  in_charge_user_id: number | null;
  is_active: boolean;
  stage?: Stage | null;
  sections?: Section[];
}

export interface Section {
  id: number;
  class_room_id: number;
  name: string;
  capacity: number | null;
  in_charge_user_id: number | null;
  is_active: boolean;
  class_room?: ClassRoom | null;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  type: string | null;
  credit_hours: string | null;
  weekly_periods: number | null;
  is_active: boolean;
}

export interface Period {
  id: number;
  name: string;
  sequence: number;
  starts_at: string | null;
  ends_at: string | null;
  is_break: boolean;
  is_active: boolean;
}

export interface Room {
  id: number;
  name: string;
  code: string;
  block: string | null;
  floor: string | null;
  type: string | null;
  capacity: number | null;
  is_active: boolean;
}

export interface TimetableSlot {
  id: number;
  academic_year_id: number;
  term_id: number | null;
  class_room_id: number;
  section_id: number | null;
  period_id: number;
  day_of_week: number;
  subject_id: number | null;
  teacher_user_id: number | null;
  room_id: number | null;
  is_published: boolean;
  notes: string | null;
  period?: Period | null;
  subject?: Subject | null;
  teacher?: User | null;
  class_room?: ClassRoom | null;
  section?: Section | null;
  room?: Room | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_active?: boolean;
  phone?: string | null;
  employee_code?: string | null;
  job_title?: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  institution_id?: number | null;
  campus_id?: number | null;
  roles?: string[];
  permissions?: string[];
  campus?: Campus | null;
  institution?: Institution | null;
  two_factor_enabled?: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface RoleOption {
  value: string;
  label: string;
}

export interface ActivityLog {
  id: number;
  log_name: string | null;
  description: string;
  event: string | null;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  causer_name: string | null;
  properties: Record<string, unknown>;
  created_at: string | null;
}

export interface AuditLogFilters {
  log_names: string[];
  events: string[];
  subject_types: string[];
}

export interface AppNotification {
  id: number;
  type: string | null;
  type_label: string | null;
  channel: string | null;
  channel_label: string | null;
  student_id: number | null;
  student?: string | null;
  admission_no?: string | null;
  guardian_id: number | null;
  guardian?: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  title: string;
  body: string;
  occurred_on: string | null;
  status: string | null;
  status_label: string | null;
  sent_at: string | null;
  failure_reason: string | null;
  created_at: string | null;
}

export interface SsoProvider {
  id: number;
  institution_id: number | null;
  name: string;
  provider: string | null;
  client_id: string;
  authorize_url: string;
  token_url: string;
  userinfo_url: string;
  logout_url: string | null;
  redirect_uri: string;
  scopes: string | null;
  is_active: boolean;
  jit_provisioning: boolean;
  default_role: string | null;
  has_client_secret: boolean;
  created_at?: string | null;
}

export interface ScopeAssignment {
  id: number;
  user_id: number;
  role: string | null;
  role_label: string | null;
  institution_id: number | null;
  campus_id: number | null;
  scope_type: string | null;
  scope_id: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  campus?: Campus | null;
  created_at?: string | null;
}

export interface ClassSubject {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  subject_id: number;
  is_elective: boolean;
  weekly_periods: number | null;
  is_active: boolean;
  subject?: Subject | null;
  class_room?: ClassRoom | null;
}

export interface TeachingAssignment {
  id: number;
  academic_year_id: number;
  teacher_user_id: number;
  subject_id: number;
  class_room_id: number;
  section_id: number | null;
  weekly_periods: number | null;
  is_active: boolean;
  teacher?: User | null;
  subject?: Subject | null;
  class_room?: ClassRoom | null;
  section?: Section | null;
}

export interface StudentAttendance {
  id: number;
  student_id: number;
  student?: {
    id: number;
    name: string;
    admission_no: string;
    gender: string | null;
  } | null;
  academic_year_id: number | null;
  class_room_id: number | null;
  class_room: string | null;
  section_id: number | null;
  section: string | null;
  attendance_date: string | null;
  status: string | null;
  status_label: string | null;
  remarks: string | null;
  marked_by: string | null;
}

export interface StaffAttendance {
  id: number;
  user_id: number;
  user?: { id: number; name: string; email: string } | null;
  attendance_date: string | null;
  status: string | null;
  status_label: string | null;
  check_in: string | null;
  check_out: string | null;
  remarks: string | null;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  user?: { id: number; name: string; email: string } | null;
  leave_type: string | null;
  leave_type_label: string | null;
  from_date: string | null;
  to_date: string | null;
  days: string | null;
  reason: string | null;
  status: string | null;
  status_label: string | null;
  decided_by: string | null;
  decided_on: string | null;
  decision_note: string | null;
}

export interface AttendanceClassSummary {
  class_room_id: number | null;
  class_room: string | null;
  total: number;
  boys: number;
  girls: number;
  present: number;
  leave: number;
  absent: number;
}

export interface AttendanceReport {
  from: string;
  to: string;
  classes: AttendanceClassSummary[];
  totals: {
    total: number;
    boys: number;
    girls: number;
    present: number;
    leave: number;
    absent: number;
  };
}

export interface StudentAttendanceSummary {
  student_id: number;
  from: string;
  to: string;
  present: number;
  late: number;
  leave: number;
  absent: number;
  excused: number;
  marked: number;
}

export interface StaffAttendanceReport {
  from: string;
  to: string;
  by_status: Record<string, number>;
  by_staff: {
    user_id: number;
    user: string | null;
    present: number;
    late: number;
    leave: number;
    absent: number;
    days: number;
  }[];
}

export interface BudgetVsActualRow {
  chart_of_account_id: number;
  code: string;
  name: string;
  account_type: string;
  normal_balance: string;
  budget: string;
  actual: string;
  variance: string;
  utilization: number | null;
  favorable: boolean;
}

export interface ExamType {
  id: number;
  name: string;
  code: string;
  weightage: string | null;
  is_active: boolean;
  description: string | null;
}

export interface GradeScaleItem {
  id: number;
  grade_scale_id: number;
  sequence: number;
  grade: string;
  min_percentage: string;
  max_percentage: string;
  points: string | null;
  remark: string | null;
}

export interface GradeScale {
  id: number;
  name: string;
  code: string;
  is_default: boolean;
  is_active: boolean;
  items: GradeScaleItem[];
}

export interface Exam {
  id: number;
  academic_year_id: number;
  term_id: number | null;
  exam_type_id: number;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string | null;
  description: string | null;
  exam_type?: ExamType | null;
  papers?: ExamPaper[];
}

export interface ExamPaper {
  id: number;
  exam_id: number;
  class_room_id: number;
  subject_id: number;
  room_id: number | null;
  exam_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_marks: string;
  pass_marks: string;
  class_room?: ClassRoom | null;
  subject?: Subject | null;
  room?: Room | null;
}

export interface ExamMark {
  id: number;
  exam_id: number;
  exam_paper_id: number;
  student_id: number;
  class_room_id: number;
  subject_id: number;
  marks_obtained: string | null;
  original_marks_obtained: string | null;
  moderated_marks_obtained: string | null;
  effective_marks: string | null;
  moderation_source: string | null;
  is_absent: boolean;
  remarks: string | null;
  student?: Student | null;
  subject?: Subject | null;
}

export interface ResultCardSubject {
  exam_paper_id: number;
  subject_id: number;
  subject: string | null;
  max_marks: number;
  pass_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks: string | null;
  passed: boolean;
}

export interface ResultCard {
  student_id: number;
  exam_id: number;
  class_room_id: number | null;
  subjects: ResultCardSubject[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string | null;
  grade_points: string | null;
  failed_subjects: number;
  result: string;
}

export interface MeritListRow {
  student_id: number;
  student: string;
  total_obtained: number;
  percentage: number;
  rank: number;
  grade: string | null;
}

export interface ExamModeration {
  id: number;
  exam_id: number;
  exam?: Exam | null;
  exam_paper_id: number;
  paper?: ExamPaper | null;
  type: string | null;
  value: number;
  reason: string | null;
  status: string | null;
  created_by: number | null;
  approved_by: number | null;
  applied_at: string | null;
}

export interface ExamReevaluation {
  id: number;
  exam_id: number;
  exam?: Exam | null;
  exam_paper_id: number;
  paper?: ExamPaper | null;
  student_id: number;
  student?: Student | null;
  reason: string | null;
  status: string | null;
  original_marks: number | null;
  revised_marks: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  remarks: string | null;
}

export interface ExamSupplementary {
  id: number;
  original_exam_id: number;
  original_exam?: Exam | null;
  exam_id: number | null;
  exam?: Exam | null;
  exam_paper_id: number | null;
  student_id: number;
  student?: Student | null;
  subject_id: number | null;
  subject?: Subject | null;
  fee_amount: number;
  is_paid: boolean;
  status: string | null;
  approved_by: number | null;
  approved_at: string | null;
  remarks: string | null;
}

export interface SupplementaryEligibleRow {
  student_id: number;
  student: string | null;
  exam_paper_id: number;
  class_room_id: number;
  subject_id: number;
  marks_obtained: number;
  pass_marks: number;
}

export interface InvigilationDuty {
  id: number;
  exam_paper_id: number;
  user_id: number;
  role: string | null;
  notes: string | null;
  user?: User | null;
  paper?: ExamPaper | null;
  created_at?: string | null;
}

export interface ExamClassAnalysisSubject {
  subject_id: number;
  subject: string | null;
  papers: number;
  appeared: number;
  absent: number;
  passed: number;
  pass_rate: number;
  average_percentage: number;
  highest: number | null;
  lowest: number | null;
}

export interface ExamClassAnalysis {
  class_room_id: number;
  exam_id: number;
  subjects: ExamClassAnalysisSubject[];
  students: number;
  average_percentage: number;
  grade_distribution: Record<string, number>;
}

export interface SubjectAnalysisClass {
  exam_paper_id: number;
  class_room_id: number;
  appeared: number;
  passed: number;
  pass_rate: number;
  average_percentage: number;
}

export interface ExamSubjectAnalysis {
  exam_id: number;
  subject_id: number;
  classes: SubjectAnalysisClass[];
}

export interface TeacherAnalysisRow {
  teacher_id: number;
  teacher: string | null;
  appeared: number;
  passed: number;
  pass_rate: number;
  average_percentage: number;
}

export interface YearOnYearRow {
  exam_id: number;
  academic_year_id: number;
  academic_year: string | null;
  appeared: number;
  average_percentage: number;
}

export interface CourseRegistration {
  id: number;
  student_id: number;
  student?: Student | null;
  term_id: number;
  term?: Term | null;
  class_room_id: number | null;
  subject_id: number;
  subject?: Subject | null;
  credit_hours: number;
  status: string | null;
  registered_on: string | null;
  remarks: string | null;
  created_at?: string | null;
}

export interface TermGpaSubject {
  course_registration_id: number;
  subject_id: number;
  subject: string | null;
  credit_hours: number;
  percentage: number | null;
  grade: string | null;
  grade_points: number | null;
  status: string | null;
}

export interface TermGpa {
  term: { id: number; name: string; academic_year_id: number };
  student_id: number;
  credits_registered: number;
  credits_graded: number;
  credits_earned: number;
  gpa: number | null;
  subjects: TermGpaSubject[];
}

export interface Transcript {
  student_id: number;
  student: string;
  terms: TermGpa[];
  credits_earned: number;
  gpa: number | null;
}

export interface SyllabusUnit {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  subject_id: number;
  term_id: number | null;
  title: string;
  description: string | null;
  sequence: number;
  estimated_periods: number | null;
  subject?: Subject | null;
  class_room?: ClassRoom | null;
  term?: Term | null;
  created_at?: string | null;
}

export interface ClassBook {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  subject_id: number | null;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  edition: string | null;
  price: string | null;
  is_required: boolean;
  subject?: Subject | null;
  class_room?: ClassRoom | null;
  created_at?: string | null;
}

export interface LessonPlan {
  id: number;
  academic_year_id: number;
  class_room_id: number;
  subject_id: number;
  term_id: number | null;
  syllabus_unit_id: number | null;
  created_by: number | null;
  approved_by: number | null;
  title: string;
  objectives: string | null;
  content: string | null;
  resources: string | null;
  activities: string | null;
  assessment: string | null;
  planned_from: string | null;
  planned_to: string | null;
  status: string | null;
  approved_at: string | null;
  subject?: Subject | null;
  class_room?: ClassRoom | null;
  syllabus_unit?: SyllabusUnit | null;
  created_at?: string | null;
}

export interface Scholarship {
  id: number;
  name: string;
  code: string;
  type: string | null;
  type_label?: string | null;
  discount_type: string | null;
  discount_type_label?: string | null;
  value: string;
  academic_year_id: number | null;
  academic_year?: string | null;
  sponsor: string | null;
  description: string | null;
  is_active: boolean;
  awards_count?: number;
  created_at?: string | null;
}

export interface ScholarshipAwardSummary {
  id: number;
  name: string;
  code: string;
  type: string | null;
  discount_type: string | null;
  value: string;
}

export interface ScholarshipAwardStudent {
  id: number;
  name: string;
  admission_no: string;
}

export interface ScholarshipAward {
  id: number;
  scholarship_id: number;
  scholarship?: ScholarshipAwardSummary | null;
  student_id: number;
  student?: ScholarshipAwardStudent | null;
  academic_year_id: number | null;
  awarded_on: string | null;
  status: string | null;
  status_label?: string | null;
  value_override: string | null;
  effective_value?: string | null;
  notes: string | null;
  approved_by?: string | null;
  revoked_on: string | null;
  created_at?: string | null;
}

export interface Book {
  id: number;
  campus_id?: number;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  category: string | null;
  total_copies: number;
  available_copies: number;
  shelf: string | null;
  price: number;
  is_active: boolean;
  created_at?: string | null;
}

export interface BookIssue {
  id: number;
  campus_id?: number;
  book_id: number;
  book?: Book | null;
  member_type: string | null;
  student_id: number | null;
  student?: Student | null;
  user_id: number | null;
  issued_on: string | null;
  due_on: string | null;
  returned_on: string | null;
  fine_amount: number;
  status: string | null;
  notes: string | null;
  issued_by: number | null;
  created_at?: string | null;
}

export interface LibrarySummary {
  titles: number;
  copies: number;
  available: number;
  issued: number;
  overdue: number;
  lost: number;
  fines_collected: number;
}

export interface Lab {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  type: string | null;
  location: string | null;
  capacity: number;
  incharge_user_id: number | null;
  incharge?: User | null;
  is_active: boolean;
  equipment?: LabEquipment[];
  created_at?: string | null;
}

export interface LabEquipment {
  id: number;
  campus_id?: number;
  lab_id: number;
  name: string;
  code: string | null;
  quantity: number;
  condition: string | null;
  purchased_on: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface LabBooking {
  id: number;
  campus_id?: number;
  lab_id: number;
  lab?: Lab | null;
  class_room_id: number | null;
  class_room?: ClassRoom | null;
  teacher_user_id: number | null;
  teacher?: User | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  purpose: string | null;
  status: string | null;
  created_at?: string | null;
}

export interface LabSummary {
  lab_id: number;
  equipment_count: number;
  equipment_quantity: number;
  by_condition: Record<string, number>;
  upcoming_sessions: number;
  needs_attention: number;
}

export interface Department {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  head?: User | null;
  designations_count?: number;
  staff_count?: number;
  created_at?: string | null;
}

export interface Designation {
  id: number;
  campus_id?: number;
  department_id: number | null;
  name: string;
  code: string;
  grade: string | null;
  job_description: string | null;
  responsibilities: string[];
  is_active: boolean;
  department?: Department | null;
  created_at?: string | null;
}

export interface StaffDocument {
  id: number;
  staff_member_id: number;
  type: string | null;
  type_label?: string | null;
  title: string | null;
  original_name: string | null;
  mime_type: string | null;
  size: number | null;
  issued_on: string | null;
  expires_on: string | null;
  is_verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  notes: string | null;
  uploaded_by?: string | null;
  download_url?: string;
  created_at?: string | null;
}

export interface StaffMember {
  id: number;
  campus_id?: number;
  user_id: number | null;
  employee_no: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  cnic: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employment_type: string | null;
  employment_type_label?: string | null;
  status: string | null;
  status_label?: string | null;
  joining_date: string | null;
  leaving_date: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  tax_number: string | null;
  notes: string | null;
  department?: Department | null;
  designation?: Designation | null;
  user?: User | null;
  documents?: StaffDocument[];
  created_at?: string | null;
}

export interface StaffHeadcountGroup {
  department_id?: number;
  department?: string;
  designation_id?: number;
  designation?: string;
  total: number;
}

export interface StaffHeadcount {
  as_on: string;
  total: number;
  by_department: StaffHeadcountGroup[];
  by_designation: StaffHeadcountGroup[];
  by_status: { status: string; total: number }[];
  by_employment_type: { employment_type: string; total: number }[];
}

export interface StaffMovementRow {
  id: number;
  employee_no: string;
  name: string;
  department: string | null;
  designation: string | null;
  date: string | null;
}

export interface StaffJoinersLeavers {
  from: string;
  to: string;
  joiners: StaffMovementRow[];
  leavers: StaffMovementRow[];
}

export interface SalaryComponent {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  type: string | null;
  type_label?: string | null;
  calculation: string | null;
  default_amount: string | null;
  default_percentage: string | null;
  is_taxable: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
}

export interface StaffSalaryItem {
  id: number;
  staff_salary_id: number;
  salary_component_id: number;
  amount: string | null;
  percentage: string | null;
  component?: SalaryComponent | null;
}

export interface StaffSalary {
  id: number;
  campus_id?: number;
  staff_member_id: number;
  basic_salary: string;
  currency: string;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  items: StaffSalaryItem[];
  staff_member?: StaffMember | null;
  created_at?: string | null;
}

export interface PayrollAdjustment {
  id: number;
  campus_id?: number;
  staff_member_id: number;
  type: string | null;
  type_label?: string | null;
  amount: string;
  period: string;
  reason: string | null;
  is_applied: boolean;
  staff_member?: StaffMember | null;
  created_at?: string | null;
}

export interface PayslipItem {
  id: number;
  label: string;
  type: string | null;
  amount: string;
  source: string | null;
  salary_component_id: number | null;
  payroll_adjustment_id: number | null;
}

export interface Payslip {
  id: number;
  payroll_run_id: number;
  staff_member_id: number;
  staff_salary_id: number | null;
  basic: string;
  gross: string;
  deductions: string;
  net: string;
  working_days: number | null;
  present_days: number | null;
  notes: string | null;
  staff_member?: StaffMember | null;
  items?: PayslipItem[];
  created_at?: string | null;
}

export interface PayrollRun {
  id: number;
  campus_id?: number;
  fiscal_year_id: number | null;
  period: string;
  status: string | null;
  status_label?: string | null;
  total_gross: string;
  total_deductions: string;
  total_net: string;
  notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  journal_entry_id: number | null;
  payslips_count?: number;
  payslips?: Payslip[];
  created_at?: string | null;
}

export interface InventoryCategory {
  id: number;
  campus_id?: number;
  name: string;
  code: string | null;
  description: string | null;
  items_count?: number;
  created_at?: string | null;
}

export interface InventoryItem {
  id: number;
  campus_id?: number;
  inventory_category_id: number | null;
  category?: InventoryCategory | null;
  name: string;
  code: string;
  unit: string | null;
  unit_cost: number;
  quantity: number;
  reorder_level: number;
  is_low_stock: boolean;
  is_active: boolean;
  created_at?: string | null;
}

export interface InventoryStockMovement {
  id: number;
  inventory_item_id: number;
  item?: InventoryItem | null;
  type: string | null;
  quantity: number;
  unit_cost: number;
  reference: string | null;
  notes: string | null;
  moved_on: string | null;
  created_by: number | null;
  created_at?: string | null;
}

export interface InventorySummary {
  items: number;
  stock_value: number;
  low_stock: number;
  low_stock_items: {
    id: number;
    name: string;
    code: string;
    quantity: number;
    reorder_level: number;
  }[];
}

export interface Vehicle {
  id: number;
  campus_id?: number;
  name: string;
  registration_no: string;
  type: string | null;
  capacity: number;
  model: string | null;
  driver_user_id: number | null;
  driver?: User | null;
  driver_name: string | null;
  driver_phone: string | null;
  conductor_name: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface TransportRouteStop {
  id: number;
  transport_route_id: number;
  name: string;
  sequence: number;
  pickup_time: string | null;
  drop_time: string | null;
  fare: number | null;
  created_at?: string | null;
}

export interface TransportRoute {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  start_point: string | null;
  end_point: string | null;
  distance_km: number;
  fare: number;
  vehicle_id: number | null;
  vehicle?: Vehicle | null;
  is_active: boolean;
  stops?: TransportRouteStop[];
  stops_count?: number;
  allocations_count?: number;
  created_at?: string | null;
}

export interface TransportAllocation {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  transport_route_id: number;
  route?: TransportRoute | null;
  transport_route_stop_id: number | null;
  stop?: TransportRouteStop | null;
  vehicle_id: number | null;
  vehicle?: Vehicle | null;
  direction: string | null;
  start_date: string | null;
  end_date: string | null;
  fare: number;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface TransportSummary {
  vehicles: number;
  vehicle_capacity: number;
  routes: number;
  allocated_students: number;
  monthly_fare: number;
  routes_detail: {
    id: number;
    name: string;
    code: string;
    stops: number;
    allocations: number;
  }[];
}

export interface Hostel {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  type: string | null;
  warden_user_id: number | null;
  warden?: User | null;
  warden_name: string | null;
  warden_phone: string | null;
  address: string | null;
  capacity: number;
  is_active: boolean;
  rooms?: HostelRoom[];
  rooms_count?: number;
  created_at?: string | null;
}

export interface HostelRoom {
  id: number;
  campus_id?: number;
  hostel_id: number;
  room_no: string;
  floor: string | null;
  type: string | null;
  capacity: number;
  occupied: number;
  available: number;
  monthly_fee: number;
  is_active: boolean;
  created_at?: string | null;
}

export interface HostelAllocation {
  id: number;
  campus_id?: number;
  hostel_id: number;
  hostel?: Hostel | null;
  hostel_room_id: number;
  room?: HostelRoom | null;
  student_id: number;
  student?: Student | null;
  bed_no: string | null;
  allocated_on: string | null;
  vacated_on: string | null;
  monthly_fee: number;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface HostelOutpass {
  id: number;
  campus_id?: number;
  hostel_allocation_id: number | null;
  student_id: number;
  student?: Student | null;
  from_datetime: string | null;
  to_datetime: string | null;
  reason: string;
  status: string | null;
  approved_by: number | null;
  approved_at: string | null;
  created_at?: string | null;
}

export interface HostelSummary {
  hostel_id: number;
  rooms: number;
  capacity: number;
  occupied: number;
  available: number;
  by_type: Record<string, number>;
  pending_outpasses: number;
}

export interface CanteenSupplier {
  id: number;
  campus_id?: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface CanteenItem {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  category: string | null;
  unit: string | null;
  price: string;
  cost_price: string;
  track_stock: boolean;
  stock_quantity: string;
  reorder_level: string;
  is_low_stock: boolean;
  is_active: boolean;
  description: string | null;
  created_at?: string | null;
}

export interface CanteenStockEntry {
  id: number;
  campus_id?: number;
  canteen_item_id: number;
  item?: CanteenItem | null;
  supplier_id: number | null;
  supplier?: CanteenSupplier | null;
  type: string | null;
  reference: string | null;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  balance_after: string;
  entry_date: string | null;
  notes: string | null;
  recorded_by: number | null;
  created_at?: string | null;
}

export interface CanteenSaleItem {
  id: number;
  canteen_item_id: number;
  item_name: string;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  line_total: string;
}

export interface CanteenSale {
  id: number;
  campus_id?: number;
  bill_no: string;
  student_id: number | null;
  student?: Student | null;
  wallet_id: number | null;
  customer_name: string | null;
  payment_method: string | null;
  subtotal: string;
  discount: string;
  total: string;
  cost_total: string;
  status: string | null;
  sold_on: string | null;
  notes: string | null;
  journal_entry_id: number | null;
  items?: CanteenSaleItem[];
  voided_at: string | null;
  created_at?: string | null;
}

export interface StudentWallet {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  balance: string;
  daily_limit: string | null;
  low_balance_threshold: string | null;
  is_active: boolean;
  transactions?: WalletTransaction[];
  created_at?: string | null;
}

export interface WalletTransaction {
  id: number;
  student_wallet_id: number;
  type: string | null;
  amount: string;
  balance_after: string;
  reference: string | null;
  description: string | null;
  canteen_sale_id: number | null;
  transaction_date: string | null;
  journal_entry_id: number | null;
  created_at?: string | null;
}

export interface CanteenHygieneCheck {
  id: number;
  campus_id?: number;
  check_date: string | null;
  area: string;
  status: string | null;
  score: number | null;
  remarks: string | null;
  checked_by: number | null;
  created_at?: string | null;
}

export interface CanteenDailyReport {
  from: string | null;
  to: string | null;
  totals: { bills: number; revenue: number; cost: number; discount: number };
  by_day: {
    sold_on: string;
    bills: number;
    revenue: number;
    cost: number;
    discount: number;
    profit: number;
  }[];
  by_payment_method: {
    payment_method: string;
    bills: number;
    revenue: number;
  }[];
}

export interface CanteenItemWiseRow {
  canteen_item_id: number;
  item_name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CanteenProfitLoss {
  from: string | null;
  to: string | null;
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  wastage: number;
  net_profit: number;
  margin_percentage: number | null;
}

export interface CanteenWalletSummary {
  from: string | null;
  to: string | null;
  wallets: number;
  outstanding_balance: number;
  top_ups: number;
  purchases: number;
  low_balance_wallets: number;
}

export interface Sport {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  category: string | null;
  season: string | null;
  coach_user_id: number | null;
  coach?: User | null;
  min_age_years: number | null;
  max_age_years: number | null;
  min_attendance_percent: string | null;
  budget: string | null;
  is_active: boolean;
  rules: string | null;
  description: string | null;
  teams_count?: number;
  created_at?: string | null;
}

export interface SportTeam {
  id: number;
  campus_id?: number;
  sport_id: number;
  sport?: Sport | null;
  name: string;
  age_group: string | null;
  gender: string | null;
  coach_user_id: number | null;
  coach?: User | null;
  is_active: boolean;
  notes: string | null;
  members_count?: number;
  created_at?: string | null;
}

export interface SportTeamMember {
  id: number;
  campus_id?: number;
  sport_team_id: number;
  student_id: number;
  student?: Student | null;
  position: string | null;
  jersey_no: string | null;
  joined_on: string | null;
  status: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface SportTrainingSession {
  id: number;
  campus_id?: number;
  sport_team_id: number;
  team?: SportTeam | null;
  title: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  focus: string | null;
  notes: string | null;
  created_by: number | null;
  created_at?: string | null;
}

export interface SportFixture {
  id: number;
  campus_id?: number;
  sport_id: number;
  sport?: Sport | null;
  sport_team_id: number | null;
  team?: SportTeam | null;
  opponent: string;
  home_away: string | null;
  venue: string | null;
  fixture_date: string | null;
  start_time: string | null;
  status: string | null;
  our_score: number | null;
  opponent_score: number | null;
  outcome: string | null;
  remarks: string | null;
  created_at?: string | null;
}

export interface SportAchievement {
  id: number;
  campus_id?: number;
  sport_id: number;
  sport?: Sport | null;
  student_id: number | null;
  student?: Student | null;
  title: string;
  level: string | null;
  position: string | null;
  achieved_on: string | null;
  description: string | null;
  created_at?: string | null;
}

export interface SportEquipment {
  id: number;
  campus_id?: number;
  sport_id: number | null;
  sport?: Sport | null;
  name: string;
  code: string;
  unit: string | null;
  quantity: string;
  available_quantity: string;
  unit_cost: string | null;
  condition: string | null;
  is_active: boolean;
  is_out_of_stock: boolean;
  notes: string | null;
  created_at?: string | null;
}

export interface SportEquipmentMovement {
  id: number;
  campus_id?: number;
  sport_equipment_id: number;
  equipment?: SportEquipment | null;
  type: string | null;
  quantity: string;
  balance_after: string;
  issued_to: number | null;
  issued_to_user?: User | null;
  movement_date: string | null;
  remarks: string | null;
  created_by: number | null;
  created_at?: string | null;
}

export interface SportEligibility {
  sport_id: number;
  student_id: number;
  eligible: boolean;
  age: number | null;
  attendance_percent: number | null;
  attendance_window: { from: string; to: string };
  reasons: string[];
}

export interface SportSummary {
  range: { from: string | null; to: string | null };
  teams: number;
  active_members: number;
  fixtures: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    wins: number;
    losses: number;
    draws: number;
  };
  achievements: number;
  equipment: {
    items: number;
    total_quantity: number;
    out_of_stock: number;
    value: number;
  };
}

export interface StudentClub {
  id: number;
  campus_id?: number;
  name: string;
  code: string;
  category: string | null;
  description: string | null;
  patron_user_id: number | null;
  patron?: User | null;
  is_active: boolean;
  members_count?: number;
  created_at?: string | null;
}

export interface ClubMembership {
  id: number;
  student_club_id: number;
  club?: StudentClub | null;
  student_id: number;
  student?: Student | null;
  role: string | null;
  status: string | null;
  joined_on: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface StudentEvent {
  id: number;
  campus_id?: number;
  title: string;
  type: string | null;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  venue: string | null;
  budget: string | null;
  status: string | null;
  organizer_user_id: number | null;
  organizer?: User | null;
  participants_count?: number;
  created_at?: string | null;
}

export interface EventParticipant {
  id: number;
  student_event_id: number;
  event?: StudentEvent | null;
  student_id: number;
  student?: Student | null;
  role: string | null;
  status: string | null;
  position: string | null;
  remarks: string | null;
  created_at?: string | null;
}

export interface StudentCertificate {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  type: string;
  title: string;
  serial_no: string | null;
  issued_on: string | null;
  status: string | null;
  issued_by: number | null;
  remarks: string | null;
  created_at?: string | null;
}

export interface WelfareRecord {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  type: string | null;
  title: string;
  description: string | null;
  recorded_on: string | null;
  status: string | null;
  recorded_by: number | null;
  follow_up: string | null;
  created_at?: string | null;
}

export interface AlumniProfile {
  id: number;
  campus_id?: number;
  student_id: number | null;
  student?: Student | null;
  full_name: string;
  graduation_year: string | null;
  current_occupation: string | null;
  employer: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  created_at?: string | null;
}

export interface CouncilMember {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  position: string;
  term: string | null;
  from_date: string | null;
  to_date: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface Complaint {
  id: number;
  campus_id?: number;
  reference_no: string | null;
  student_id: number | null;
  student?: Student | null;
  raised_by: number | null;
  against: string | null;
  category: string | null;
  subject: string;
  description: string;
  priority: string | null;
  status: string | null;
  assigned_to: number | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at?: string | null;
}

export interface CounsellingSession {
  id: number;
  campus_id?: number;
  student_id: number;
  student?: Student | null;
  counsellor_user_id: number | null;
  counsellor?: User | null;
  session_date: string | null;
  type: string | null;
  status: string | null;
  summary: string | null;
  confidential_notes?: string | null;
  follow_up_on: string | null;
  created_at?: string | null;
}

export interface Circular {
  id: number;
  campus_id?: number;
  title: string;
  body: string;
  audience: string | null;
  class_room_id: number | null;
  class_room?: ClassRoom | null;
  section_id: number | null;
  section?: Section | null;
  status: string | null;
  published_at: string | null;
  expires_on: string | null;
  attachment_path: string | null;
  created_by: number | null;
  author?: User | null;
  created_at?: string | null;
}

export interface CountRow {
  total: number;
}

export interface ReportProgress {
  filters: {
    from: string | null;
    to: string | null;
    academic_year_id: number | null;
  };
  students: {
    total: number;
    active: number;
    by_status: { status: string; total: number }[];
    by_gender: { gender: string | null; total: number }[];
  };
  admissions: {
    total: number;
    by_status: { status: string; total: number }[];
  };
  enrollments: {
    total: number;
    by_status: { status: string; total: number }[];
  };
  scholarships: {
    active_awards: number;
    total_value: number;
    by_type: { type: string; awards: number; value: number }[];
  };
  events: { total: number };
}

export interface ReportAttendance {
  filters: {
    class_room_id: number | null;
    academic_year_id: number | null;
    from: string | null;
    to: string | null;
  };
  totals: {
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    excused: number;
    attendance_percentage: number;
  };
  by_class: {
    class_room_id: number;
    class_room: string | null;
    total: number;
    attended: number;
    absent: number;
    attendance_percentage: number;
  }[];
}

export interface ReportResults {
  exam: {
    id: number;
    name: string;
    academic_year_id: number;
    status: string | null;
  };
  totals: {
    papers: number;
    marks_entered: number;
    graded: number;
    absent: number;
    passed: number;
    failed: number;
    pass_percentage: number;
    average_percentage: number;
    highest_percentage: number;
    lowest_percentage: number;
  };
  by_paper: {
    exam_paper_id: number;
    subject: string | null;
    class_room: string | null;
    max_marks: number;
    pass_marks: number;
    entered: number;
    absent: number;
    average: number;
    average_percentage: number;
    passed: number;
    failed: number;
  }[];
}

export interface ReportStaff {
  filters: { as_on: string; from: string | null; to: string | null };
  headcount: {
    total: number;
    by_department: {
      department_id: number | null;
      department: string | null;
      total: number;
    }[];
    by_employment_type: { employment_type: string | null; total: number }[];
  };
  attendance: {
    total: number;
    by_status: { status: string | null; total: number }[];
  };
  leave: {
    total: number;
    by_status: { status: string | null; total: number }[];
    approved_days: number;
  };
}

export interface ReportStudentYearly {
  student: { id: number; admission_no: string; name: string };
  years: {
    academic_year_id: number;
    academic_year: string | null;
    class_room: string | null;
    section: string | null;
    status: string | null;
    attendance: {
      total: number;
      attended: number;
      absent: number;
      attendance_percentage: number;
    };
    academics: {
      subjects: number;
      obtained: number;
      possible: number;
      percentage: number | null;
    };
    conduct_records: number;
  }[];
  summary: {
    years: number;
    attendance_percentage: number;
    conduct_records: number;
  };
}

export interface ReportFinancial {
  filters: {
    fiscal_year_id: number | null;
    from: string | null;
    to: string | null;
  };
  income: number;
  expense: number;
  surplus: number;
  surplus_percentage: number | null;
}

export interface ReportPayroll {
  filters: { from: string | null; to: string | null };
  totals: {
    runs: number;
    gross: number;
    deductions: number;
    net: number;
    approved: number;
    paid: number;
  };
  by_period: {
    id: number;
    period: string;
    status: string | null;
    gross: number;
    deductions: number;
    net: number;
  }[];
}
