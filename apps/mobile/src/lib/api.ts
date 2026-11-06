import * as SecureStore from "expo-secure-store";

const DEFAULT_SERVER_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "eis_token";
const SERVER_KEY = "eis_server_url";

// Every request path already starts with /v1, and the API is mounted under
// /api, so the base must end with /api. Accept a server value with or without
// a scheme and the /api suffix so a bare host never resolves to a 404.
function normalizeBase(value: string): string {
  let trimmed = value.trim();

  if (!trimmed) {
    return "";
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `http://${trimmed}`;
  }

  return `${trimmed.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;
}

export function isValidServerUrl(value: string): boolean {
  return /^https?:\/\/[^\s/]+/i.test(value.trim());
}

let resolvedBase = normalizeBase(DEFAULT_SERVER_URL);
let serverUrlLoaded = false;

export function getApiBase(): string {
  return resolvedBase;
}

// The server origin without the /api suffix, suitable for display/editing.
export function getConfiguredServerUrl(): string {
  return resolvedBase.replace(/\/api$/i, "");
}

export async function loadStoredServerUrl(): Promise<void> {
  if (serverUrlLoaded) {
    return;
  }
  serverUrlLoaded = true;

  try {
    const stored = await SecureStore.getItemAsync(SERVER_KEY);
    const normalized = stored ? normalizeBase(stored) : "";
    if (normalized) {
      resolvedBase = normalized;
    }
  } catch {
    // Fall back to the configured default when storage is unavailable.
  }
}

export async function setServerUrl(value: string | null): Promise<void> {
  const normalized = value ? normalizeBase(value) : "";

  if (!normalized) {
    resolvedBase = normalizeBase(DEFAULT_SERVER_URL);
    try {
      await SecureStore.deleteItemAsync(SERVER_KEY);
    } catch {
      // Ignore storage errors; the in-memory value is already reset.
    }
    return;
  }

  resolvedBase = normalized;
  try {
    await SecureStore.setItemAsync(SERVER_KEY, normalized);
  } catch {
    // Ignore storage errors; the in-memory value still applies for this session.
  }
}

let authToken: string | null = null;

export function getToken(): string | null {
  return authToken;
}

export function setToken(value: string | null): void {
  authToken = value;

  if (value) {
    SecureStore.setItemAsync(TOKEN_KEY, value).catch(() => undefined);
  } else {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }
}

export async function loadStoredToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    authToken = stored;
    return stored;
  } catch {
    return null;
  }
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  employee_code?: string | null;
  job_title?: string | null;
  photo_url?: string | null;
  roles: string[];
  permissions: string[];
  campus?: { id: number; name: string } | null;
  institution?: { id: number; name: string } | null;
}

export interface StudentSummary {
  id: number;
  full_name: string;
  admission_no: string;
  status?: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  enrollments?: {
    id: number;
    class_room?: { id: number; name: string } | null;
    section?: { id: number; name: string } | null;
    academic_year?: { id: number; name: string } | null;
    roll_number?: string | null;
    status?: string | null;
  }[];
}

export interface AttendanceSummary {
  present: number;
  late: number;
  leave: number;
  absent: number;
  excused: number;
  marked: number;
  from: string;
  to: string;
}

export interface AttendanceRecord {
  id: number;
  attendance_date: string;
  status?: string | null;
  status_label?: string | null;
  remarks?: string | null;
  class_room?: string | null;
  section?: string | null;
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period?: { id: number; name: string; start_time?: string; end_time?: string } | null;
  subject?: { id: number; name: string } | null;
  teacher?: { id: number; name: string } | null;
  room?: { id: number; name: string } | null;
}

export interface ResultSubject {
  exam_paper_id: number;
  subject: string | null;
  max_marks: number;
  pass_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
  passed: boolean;
  remarks?: string | null;
}

export interface ResultExam {
  id: number;
  name: string;
  starts_on?: string | null;
  ends_on?: string | null;
}

export interface ResultCard {
  exam_id: number;
  exam?: ResultExam;
  subjects: ResultSubject[];
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string | null;
  grade_points: number | null;
  failed_subjects: number;
  result: string;
}

export interface FeeVoucher {
  id: number;
  voucher_no: string;
  sequence: number;
  due_date: string;
  amount: string | number;
  paid_amount: string | number;
  balance: string;
  status?: string | null;
}

export class ApiError extends Error {
  status: number;

  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  campusId?: number | null;
}

function authHeaders(campusId?: number | null): Record<string, string> {
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(campusId ? { "X-Campus-Id": String(campusId) } : {}),
  };
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, campusId } = options;

  const response = await fetch(`${resolvedBase}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(campusId),
    },
  });

  return parse<T>(response);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "POST", campusId } = options;

  const response = await fetch(`${resolvedBase}${path}`, {
    method,
    body: formData,
    headers: authHeaders(campusId),
  });

  return parse<T>(response);
}

export async function apiDownload(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Blob> {
  const { campusId } = options;

  const response = await fetch(`${resolvedBase}${path}`, {
    headers: authHeaders(campusId),
  });

  if (!response.ok) {
    throw new ApiError(response.statusText || "Download failed", response.status);
  }

  return response.blob();
}

