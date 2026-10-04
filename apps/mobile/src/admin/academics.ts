import type { ModuleConfig, SelectOption } from "./types";
import { SECTIONS } from "./sections";

const EXAM = {
  view: "exam.view",
  create: "exam.create",
  edit: "exam.edit",
  delete: "exam.delete",
};

const TIMETABLE = {
  view: "academic.view",
  create: "academic.create",
  edit: "academic.edit",
  delete: "academic.delete",
};

const CREDIT = {
  view: "credit.view",
  create: "credit.create",
  edit: "credit.edit",
  delete: "credit.delete",
};

const ATTENDANCE = {
  view: "attendance.view",
  create: "attendance.create",
  edit: "attendance.edit",
  delete: "attendance.edit",
};

const ACTIVE: SelectOption[] = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

const EXAM_STATUS: SelectOption[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "published", label: "Published" },
];

const DAY_OF_WEEK: SelectOption[] = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "7", label: "Sunday" },
];

const INVIGILATION_ROLE: SelectOption[] = [
  { value: "chief", label: "Chief invigilator" },
  { value: "assistant", label: "Assistant invigilator" },
];

const MODERATION_TYPE: SelectOption[] = [
  { value: "grace_marks", label: "Grace marks" },
  { value: "scaling", label: "Scaling" },
];

const MODERATION_STATUS: SelectOption[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Rejected" },
];

const REEVALUATION_STATUS: SelectOption[] = [
  { value: "requested", label: "Requested" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const REVIEW_STATUS: SelectOption[] = [
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const SUPPLEMENTARY_STATUS: SelectOption[] = [
  { value: "registered", label: "Registered" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const COURSE_STATUS: SelectOption[] = [
  { value: "registered", label: "Registered" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "dropped", label: "Dropped" },
];

const ATTENDANCE_STATUS: SelectOption[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

function dayLabel(value: unknown): string {
  return DAY_OF_WEEK.find((option) => option.value === String(value))?.label ?? String(value);
}

export const ACADEMICS_MODULES: ModuleConfig[] = [
  {
    key: "exam-types",
    section: SECTIONS.academics,
    label: "Exam types",
    endpoint: "/v1/exam-types",
    permissions: EXAM,
    filters: [{ param: "is_active", label: "Status", options: ACTIVE }],
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "weightage", label: "Weightage", align: "right" },
      { key: "is_active", label: "Active", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "weightage", label: "Weightage (%)", type: "number", min: 0, max: 100 },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "grade-scales",
    section: SECTIONS.academics,
    label: "Grade scales",
    endpoint: "/v1/grade-scales",
    permissions: EXAM,
    filters: [{ param: "is_active", label: "Status", options: ACTIVE }],
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "is_default", label: "Default", format: "badge" },
      { key: "is_active", label: "Active", format: "badge" },
      {
        key: "items",
        label: "Bands",
        render: (item) => (Array.isArray(item.items) ? String(item.items.length) : "-"),
      },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "is_default", label: "Default scale", type: "checkbox" },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
      {
        name: "items",
        label: "Grade bands",
        type: "repeater",
        addLabel: "Add grade band",
        hint: "Define each grade with a minimum and maximum percentage.",
        emptyItem: () => ({
          grade: "",
          min_percentage: "",
          max_percentage: "",
          points: "",
          remark: "",
          sequence: "",
        }),
        itemFields: [
          { name: "grade", label: "Grade", type: "text", required: true },
          { name: "min_percentage", label: "Min %", type: "number", required: true, min: 0, max: 100 },
          { name: "max_percentage", label: "Max %", type: "number", required: true, min: 0, max: 100 },
          { name: "points", label: "Points", type: "number", min: 0, max: 10 },
          { name: "remark", label: "Remark", type: "text" },
          { name: "sequence", label: "Sequence", type: "number", min: 1 },
        ],
        rowFromItem: (item) => ({
          grade: item.grade,
          min_percentage: item.min_percentage,
          max_percentage: item.max_percentage,
          points: item.points,
          remark: item.remark,
          sequence: item.sequence,
        }),
        mapItem: (row) => ({
          grade: row.grade,
          min_percentage: Number(row.min_percentage),
          max_percentage: Number(row.max_percentage),
          points: row.points === "" || row.points === null ? null : Number(row.points),
          remark: row.remark || null,
          sequence: row.sequence ? Number(row.sequence) : null,
        }),
      },
    ],
  },
  {
    key: "exams",
    section: SECTIONS.academics,
    label: "Exams",
    endpoint: "/v1/exams",
    permissions: EXAM,
    filters: [{ param: "status", label: "Status", options: EXAM_STATUS }],
    columns: [
      { key: "name", label: "Name" },
      { key: "exam_type.name", label: "Type" },
      { key: "starts_on", label: "Starts", format: "date" },
      { key: "ends_on", label: "Ends", format: "date" },
      { key: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "academic_year_id", label: "Academic year", type: "lookup", lookup: "academicYears", required: true },
      { name: "term_id", label: "Term", type: "lookup", lookup: "terms" },
      { name: "exam_type_id", label: "Exam type", type: "lookup", lookup: "examTypes", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "starts_on", label: "Starts on", type: "date", required: true },
      { name: "ends_on", label: "Ends on", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: EXAM_STATUS },
      { name: "description", label: "Description", type: "textarea" },
    ],
    actions: [
      {
        label: "Publish",
        path: (item) => `/v1/exams/${item.id}/publish`,
        permission: "exam.approve",
        confirm: "Publish this exam?",
        successMessage: "Exam published.",
      },
    ],
  },
  {
    key: "exam-papers",
    section: SECTIONS.academics,
    label: "Exam papers",
    endpoint: "/v1/exam-papers",
    permissions: EXAM,
    columns: [
      { key: "exam_id", label: "Exam" },
      { key: "subject.name", label: "Subject" },
      { key: "class_room.name", label: "Class" },
      { key: "exam_date", label: "Date", format: "date" },
      { key: "starts_at", label: "Start" },
      { key: "max_marks", label: "Max", align: "right" },
      { key: "pass_marks", label: "Pass", align: "right" },
    ],
    fields: [
      { name: "exam_id", label: "Exam", type: "lookup", lookup: "exams", required: true, displayKey: "exam.name" },
      { name: "class_room_id", label: "Class", type: "lookup", lookup: "classRooms", required: true, displayKey: "class_room.name" },
      { name: "subject_id", label: "Subject", type: "lookup", lookup: "subjects", required: true, displayKey: "subject.name" },
      { name: "room_id", label: "Room", type: "lookup", lookup: "rooms", displayKey: "room.name" },
      { name: "exam_date", label: "Exam date", type: "date", required: true },
      { name: "starts_at", label: "Starts at", type: "time" },
      { name: "ends_at", label: "Ends at", type: "time" },
      { name: "max_marks", label: "Max marks", type: "number", min: 0 },
      { name: "pass_marks", label: "Pass marks", type: "number", min: 0 },
    ],
  },
  {
    key: "exam-moderations",
    section: SECTIONS.academics,
    label: "Exam moderations",
    endpoint: "/v1/exam-moderations",
    permissions: EXAM,
    filters: [{ param: "status", label: "Status", options: MODERATION_STATUS }],
    columns: [
      { key: "exam_id", label: "Exam" },
      { key: "exam_paper_id", label: "Paper" },
      { key: "type", label: "Type", format: "badge" },
      { key: "value", label: "Value", align: "right" },
      { key: "status", label: "Status", format: "badge" },
      { key: "reason", label: "Reason" },
    ],
    fields: [
      { name: "exam_paper_id", label: "Exam paper", type: "lookup", lookup: "examPapers", required: true },
      { name: "type", label: "Type", type: "select", options: MODERATION_TYPE, required: true },
      { name: "value", label: "Value", type: "number", required: true },
      { name: "reason", label: "Reason", type: "text" },
    ],
    actions: [
      {
        label: "Approve",
        path: (item) => `/v1/exam-moderations/${item.id}/approve`,
        permission: "exam.approve",
        confirm: "Approve this moderation?",
        successMessage: "Moderation approved.",
      },
      {
        label: "Apply",
        path: (item) => `/v1/exam-moderations/${item.id}/apply`,
        permission: "exam.approve",
        confirm: "Apply this moderation to marks?",
        successMessage: "Moderation applied.",
      },
      {
        label: "Reject",
        path: (item) => `/v1/exam-moderations/${item.id}/reject`,
        permission: "exam.approve",
        confirm: "Reject this moderation?",
        successMessage: "Moderation rejected.",
      },
    ],
  },
  {
    key: "exam-reevaluations",
    section: SECTIONS.academics,
    label: "Exam reevaluations",
    endpoint: "/v1/exam-reevaluations",
    permissions: EXAM,
    filters: [{ param: "status", label: "Status", options: REEVALUATION_STATUS }],
    columns: [
      { key: "exam_id", label: "Exam" },
      { key: "student.full_name", label: "Student" },
      { key: "reason", label: "Reason" },
      { key: "original_marks", label: "Original", align: "right" },
      { key: "revised_marks", label: "Revised", align: "right" },
      { key: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "exam_paper_id", label: "Exam paper", type: "lookup", lookup: "examPapers", required: true },
      { name: "student_id", label: "Student", type: "lookup", lookup: "students", required: true, displayKey: "student.full_name" },
      { name: "reason", label: "Reason", type: "text" },
    ],
    actions: [
      {
        label: "Review",
        path: (item) => `/v1/exam-reevaluations/${item.id}/review`,
        permission: "exam.approve",
        submitLabel: "Save review",
        successMessage: "Reevaluation updated.",
        fields: [
          { name: "status", label: "Status", type: "select", options: REVIEW_STATUS, required: true },
          { name: "revised_marks", label: "Revised marks", type: "number", min: 0 },
          { name: "remarks", label: "Remarks", type: "text" },
        ],
      },
    ],
  },
  {
    key: "exam-supplementaries",
    section: SECTIONS.academics,
    label: "Exam supplementaries",
    endpoint: "/v1/exam-supplementaries",
    permissions: EXAM,
    filters: [{ param: "status", label: "Status", options: SUPPLEMENTARY_STATUS }],
    columns: [
      { key: "student.full_name", label: "Student" },
      { key: "subject.name", label: "Subject" },
      { key: "fee_amount", label: "Fee", format: "money", align: "right" },
      { key: "is_paid", label: "Paid", format: "badge" },
      { key: "status", label: "Status", format: "badge" },
    ],
    fields: [
      { name: "original_exam_id", label: "Original exam", type: "lookup", lookup: "exams", required: true },
      { name: "exam_id", label: "Supplementary exam", type: "lookup", lookup: "exams" },
      { name: "exam_paper_id", label: "Exam paper", type: "lookup", lookup: "examPapers" },
      { name: "student_id", label: "Student", type: "lookup", lookup: "students", required: true, displayKey: "student.full_name" },
      { name: "subject_id", label: "Subject", type: "lookup", lookup: "subjects", displayKey: "subject.name" },
      { name: "fee_amount", label: "Fee amount", type: "number", min: 0 },
      { name: "is_paid", label: "Fee paid", type: "checkbox" },
      { name: "remarks", label: "Remarks", type: "text" },
    ],
    actions: [
      {
        label: "Approve",
        path: (item) => `/v1/exam-supplementaries/${item.id}/approve`,
        permission: "exam.approve",
        confirm: "Approve this supplementary registration?",
        successMessage: "Supplementary approved.",
      },
      {
        label: "Reject",
        path: (item) => `/v1/exam-supplementaries/${item.id}/reject`,
        permission: "exam.approve",
        confirm: "Reject this supplementary registration?",
        successMessage: "Supplementary rejected.",
      },
      {
        label: "Complete",
        path: (item) => `/v1/exam-supplementaries/${item.id}/complete`,
        permission: "exam.edit",
        confirm: "Mark this supplementary as complete?",
        successMessage: "Supplementary completed.",
      },
    ],
  },
  {
    key: "invigilation-duties",
    section: SECTIONS.academics,
    label: "Invigilation duties",
    endpoint: "/v1/invigilation-duties",
    permissions: EXAM,
    columns: [
      { key: "user.name", label: "Invigilator" },
      { key: "exam_paper_id", label: "Paper" },
      { key: "role", label: "Role", format: "badge" },
      { key: "notes", label: "Notes" },
    ],
    fields: [
      { name: "exam_paper_id", label: "Exam paper", type: "lookup", lookup: "examPapers", required: true },
      { name: "user_id", label: "Invigilator", type: "lookup", lookup: "staffUsers", required: true, displayKey: "user.name" },
      { name: "role", label: "Role", type: "select", options: INVIGILATION_ROLE },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "timetable-slots",
    section: SECTIONS.academics,
    label: "Timetable slots",
    endpoint: "/v1/timetable-slots",
    permissions: TIMETABLE,
    columns: [
      {
        key: "day_of_week",
        label: "Day",
        render: (item) => dayLabel(item.day_of_week),
      },
      { key: "period.name", label: "Period" },
      { key: "subject.name", label: "Subject" },
      { key: "class_room.name", label: "Class" },
      { key: "section.name", label: "Section" },
      { key: "teacher.name", label: "Teacher" },
      { key: "room.name", label: "Room" },
      { key: "is_published", label: "Published", format: "badge" },
    ],
    fields: [
      { name: "academic_year_id", label: "Academic year", type: "lookup", lookup: "academicYears", required: true },
      { name: "term_id", label: "Term", type: "lookup", lookup: "terms" },
      { name: "class_room_id", label: "Class", type: "lookup", lookup: "classRooms", required: true, displayKey: "class_room.name" },
      { name: "section_id", label: "Section", type: "lookup", lookup: "sections", dependsOn: "class_room_id", displayKey: "section.name" },
      { name: "period_id", label: "Period", type: "lookup", lookup: "periods", required: true, displayKey: "period.name" },
      { name: "day_of_week", label: "Day", type: "select", options: DAY_OF_WEEK, required: true },
      { name: "subject_id", label: "Subject", type: "lookup", lookup: "subjects", displayKey: "subject.name" },
      { name: "teacher_user_id", label: "Teacher", type: "lookup", lookup: "staffUsers", displayKey: "teacher.name" },
      { name: "room_id", label: "Room", type: "lookup", lookup: "rooms", displayKey: "room.name" },
      { name: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "course-registrations",
    section: SECTIONS.academics,
    label: "Course registrations",
    endpoint: "/v1/course-registrations",
    permissions: CREDIT,
    filters: [{ param: "status", label: "Status", options: COURSE_STATUS }],
    columns: [
      { key: "student.full_name", label: "Student" },
      { key: "term.name", label: "Term" },
      { key: "subject.name", label: "Subject" },
      { key: "credit_hours", label: "Credits", align: "right" },
      { key: "status", label: "Status", format: "badge" },
      { key: "registered_on", label: "Registered", format: "date" },
    ],
    fields: [
      { name: "student_id", label: "Student", type: "lookup", lookup: "students", required: true, displayKey: "student.full_name" },
      { name: "term_id", label: "Term", type: "lookup", lookup: "terms", required: true, displayKey: "term.name" },
      { name: "subject_id", label: "Subject", type: "lookup", lookup: "subjects", required: true, displayKey: "subject.name" },
      { name: "class_room_id", label: "Class", type: "lookup", lookup: "classRooms", displayKey: "class_room.name" },
      { name: "credit_hours", label: "Credit hours", type: "number", min: 0, max: 30 },
      { name: "remarks", label: "Remarks", type: "text" },
    ],
    actions: [
      {
        label: "Drop",
        path: (item) => `/v1/course-registrations/${item.id}/drop`,
        permission: "credit.edit",
        confirm: "Drop this course registration?",
        successMessage: "Course registration dropped.",
      },
    ],
  },
  {
    key: "student-attendance",
    section: SECTIONS.academics,
    label: "Student attendance",
    endpoint: "/v1/attendance/students",
    permissions: ATTENDANCE,
    filters: [{ param: "status", label: "Status", options: ATTENDANCE_STATUS }],
    columns: [
      { key: "student.name", label: "Student" },
      { key: "student.admission_no", label: "Admission no" },
      { key: "attendance_date", label: "Date", format: "date" },
      { key: "class_room", label: "Class" },
      { key: "section", label: "Section" },
      { key: "status_label", label: "Status", format: "badge" },
      { key: "remarks", label: "Remarks" },
    ],
    fields: [
      { name: "student_id", label: "Student", type: "lookup", lookup: "students", required: true, displayKey: "student.name" },
      { name: "attendance_date", label: "Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: ATTENDANCE_STATUS, required: true },
      { name: "class_room_id", label: "Class", type: "lookup", lookup: "classRooms", displayKey: "class_room.name" },
      { name: "section_id", label: "Section", type: "lookup", lookup: "sections", dependsOn: "class_room_id", displayKey: "section.name" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
  },
  {
    key: "staff-attendance",
    section: SECTIONS.academics,
    label: "Staff attendance",
    endpoint: "/v1/attendance/staff",
    permissions: ATTENDANCE,
    filters: [{ param: "status", label: "Status", options: ATTENDANCE_STATUS }],
    columns: [
      { key: "user.name", label: "Staff" },
      { key: "attendance_date", label: "Date", format: "date" },
      { key: "status_label", label: "Status", format: "badge" },
      { key: "check_in", label: "Check in" },
      { key: "check_out", label: "Check out" },
      { key: "remarks", label: "Remarks" },
    ],
    fields: [
      { name: "user_id", label: "Staff", type: "lookup", lookup: "staffUsers", required: true, displayKey: "user.name" },
      { name: "attendance_date", label: "Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: ATTENDANCE_STATUS, required: true },
      { name: "check_in", label: "Check in", type: "time" },
      { name: "check_out", label: "Check out", type: "time" },
      { name: "remarks", label: "Remarks", type: "textarea" },
    ],
  },
];
