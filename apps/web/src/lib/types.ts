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

export interface FeeHead {
  id: number;
  code: string | null;
  name: string;
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
