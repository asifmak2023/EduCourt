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

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period?: { id: number; name?: string | null; starts_at?: string | null; ends_at?: string | null } | null;
  subject?: { id: number; name?: string | null } | null;
  class_room?: { id: number; name?: string | null } | null;
  section?: { id: number; name?: string | null } | null;
  room?: { id: number; name?: string | null } | null;
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
