import type { ModuleConfig, SelectOption } from "./types";
import { SECTIONS } from "./sections";

const ACTIVE: SelectOption[] = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

export const ROLE_OPTIONS: SelectOption[] = [
  { value: "platform_admin", label: "Super User (Product Owner)" },
  { value: "campus_admin", label: "Campus Admin" },
  { value: "principal", label: "Principal / Head" },
  { value: "finance_head", label: "Finance Head" },
  { value: "accountant", label: "Accountant" },
  { value: "admissions_officer", label: "Admissions / Receptionist" },
  { value: "hr_officer", label: "HR Officer" },
  { value: "academic_coordinator", label: "Academic Coordinator" },
  { value: "teacher", label: "Teacher" },
  { value: "exam_controller", label: "Exam Controller" },
  { value: "student_affairs_officer", label: "Student Affairs Officer" },
  { value: "counsellor", label: "Counsellor" },
  { value: "canteen_manager", label: "Canteen Manager" },
  { value: "sports_director", label: "Sports Director / Coach" },
  { value: "it_administrator", label: "IT Administrator" },
  { value: "librarian", label: "Librarian / Lab In-charge" },
  { value: "store_incharge", label: "Store In-charge" },
  { value: "transport_hostel_incharge", label: "Transport / Hostel In-charge" },
  { value: "parent_guardian", label: "Parent / Guardian" },
  { value: "student", label: "Student" },
];

const USERS = {
  view: "user.view",
  create: "user.create",
  edit: "user.edit",
  delete: "user.delete",
  photo: "user.photo",
};

const INSTITUTION = {
  view: "institution.view",
  create: "institution.create",
  edit: "institution.edit",
  delete: "institution.delete",
};

const CAMPUS = {
  view: "campus.view",
  create: "campus.create",
  edit: "campus.edit",
  delete: "campus.delete",
};

const SETTING = {
  view: "setting.view",
  create: "setting.edit",
  edit: "setting.edit",
  delete: "setting.edit",
};

const CAMPUS_TYPE: SelectOption[] = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
];

function roleLabel(value: unknown): string {
  return ROLE_OPTIONS.find((option) => option.value === value)?.label ?? String(value);
}

export const ADMINISTRATION_MODULES: ModuleConfig[] = [
  {
    key: "users",
    section: SECTIONS.administration,
    label: "Users",
    endpoint: "/v1/users",
    permissions: USERS,
    searchable: true,
    filters: [
      { param: "role", label: "Role", options: ROLE_OPTIONS },
      { param: "is_active", label: "Status", options: ACTIVE },
    ],
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      {
        key: "roles",
        label: "Roles",
        render: (item) => {
          const roles = Array.isArray(item.roles) ? (item.roles as string[]) : [];
          return roles.map(roleLabel).join(", ") || "-";
        },
      },
      { key: "campus.name", label: "Campus" },
      { key: "is_active", label: "Active", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "text", hint: "Minimum 8 characters. Leave blank to keep unchanged." },
      { name: "phone", label: "Phone", type: "text" },
      { name: "employee_code", label: "Employee code", type: "text" },
      { name: "job_title", label: "Job title", type: "text" },
      { name: "institution_id", label: "Institution", type: "lookup", lookup: "institutions", displayKey: "institution.name" },
      { name: "campus_id", label: "Campus", type: "lookup", lookup: "campuses", displayKey: "campus.name" },
      { name: "roles", label: "Roles", type: "multiselect", options: ROLE_OPTIONS },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
      { name: "photo", label: "Photo", type: "photo", path: "/v1/users/{id}/photo" },
    ],
  },
  {
    key: "institutions",
    section: SECTIONS.administration,
    label: "Institutions",
    endpoint: "/v1/institutions",
    permissions: INSTITUTION,
    searchable: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "legal_name", label: "Legal name" },
      { key: "email", label: "Email" },
      { key: "is_active", label: "Active", format: "badge" },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "legal_name", label: "Legal name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "website", label: "Website", type: "text" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
  {
    key: "campuses",
    section: SECTIONS.administration,
    label: "Campuses",
    endpoint: "/v1/campuses",
    permissions: CAMPUS,
    searchable: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "type", label: "Type", format: "badge" },
      { key: "institution.name", label: "Institution" },
      { key: "email", label: "Email" },
      { key: "is_active", label: "Active", format: "badge" },
    ],
    fields: [
      { name: "institution_id", label: "Institution", type: "lookup", lookup: "institutions", required: true, displayKey: "institution.name" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "type", label: "Type", type: "select", required: true, options: CAMPUS_TYPE },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "whatsapp", label: "WhatsApp", type: "text" },
      { name: "website", label: "Website", type: "text" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
  {
    key: "sso-providers",
    section: SECTIONS.administration,
    label: "SSO providers",
    endpoint: "/v1/sso-providers",
    permissions: SETTING,
    searchable: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "provider", label: "Provider", format: "badge" },
      { key: "client_id", label: "Client ID" },
      { key: "is_active", label: "Active", format: "badge" },
      { key: "jit_provisioning", label: "JIT", format: "badge" },
    ],
    fields: [
      { name: "institution_id", label: "Institution", type: "lookup", lookup: "institutions", required: true, displayKey: "institution.name" },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "provider", label: "Provider", type: "select", options: [{ value: "oidc", label: "OIDC" }] },
      { name: "client_id", label: "Client ID", type: "text", required: true },
      { name: "client_secret", label: "Client secret", type: "text", hint: "Leave blank to keep the existing secret." },
      { name: "authorize_url", label: "Authorize URL", type: "text", required: true },
      { name: "token_url", label: "Token URL", type: "text", required: true },
      { name: "userinfo_url", label: "Userinfo URL", type: "text", required: true },
      { name: "logout_url", label: "Logout URL", type: "text" },
      { name: "redirect_uri", label: "Redirect URI", type: "text", required: true },
      { name: "scopes", label: "Scopes", type: "text" },
      { name: "default_role", label: "Default role", type: "select", options: ROLE_OPTIONS },
      { name: "jit_provisioning", label: "JIT provisioning", type: "checkbox" },
      { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
    ],
  },
];
