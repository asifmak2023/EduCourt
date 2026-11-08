export interface ApiErrorShape {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

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

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  campusId?: number | null;
  campusScope?: boolean;
}

/*
 * The dashboard keeps a single "working campus" for the signed-in user. It is
 * resolved lazily at request time so requests made outside the React tree are
 * scoped consistently with the visible page.
 */
let resolveActiveCampus: () => number | null = () => null;

export function setActiveCampusResolver(
  resolver: (() => number | null) | null
): void {
  resolveActiveCampus = resolver ?? (() => null);
}

export function getActiveCampusId(): number | null {
  return resolveActiveCampus();
}

/*
 * Endpoints that intentionally span every campus. Sending X-Campus-Id to these
 * would narrow institution-wide roll-ups or hide the campus list itself, so
 * they are never scoped by the working campus.
 */
const UNSCOPED_PREFIXES = [
  "/v1/auth",
  "/v1/me",
  "/v1/meta",
  "/v1/campuses",
  "/v1/institutions",
  "/v1/users",
  "/v1/roles",
  "/v1/scope-assignments",
  "/v1/audit-logs",
  "/v1/reports/institution-overview",
  "/v1/reports/platform-overview",
  "/v1/reports/head-office",
  "/v1/reports/campus-comparison",
  "/v1/reports/campus",
];

function isUnscopedPath(path: string): boolean {
  const clean = path.split("?")[0] ?? path;

  return UNSCOPED_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

function campusHeader(
  path: string,
  campusId: number | null | undefined,
  campusScope: boolean | undefined
): Record<string, string> {
  if (campusScope === false) {
    return {};
  }

  const resolved =
    campusId !== undefined
      ? campusId
      : isUnscopedPath(path)
        ? null
        : getActiveCampusId();

  return resolved ? { "X-Campus-Id": String(resolved) } : {};
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, campusId, campusScope, headers, ...rest } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...campusHeader(path, campusId, campusScope),
      ...(headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorShape>;
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { campusId?: number | null; campusScope?: boolean } = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    headers: {
      Accept: "application/json",
      ...campusHeader(path, options.campusId, options.campusScope),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorShape>;
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}

export async function apiDownload(
  path: string,
  options: { campusId?: number | null; campusScope?: boolean } = {}
): Promise<Blob> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: campusHeader(path, options.campusId, options.campusScope),
  });

  if (!response.ok) {
    throw new ApiError(response.statusText || "Download failed", response.status);
  }

  return response.blob();
}
