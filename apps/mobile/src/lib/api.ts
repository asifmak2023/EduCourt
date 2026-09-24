const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

let authToken: string | null = null;

export function setToken(value: string | null): void {
  authToken = value;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  campus?: { id: number; name: string } | null;
  institution?: { id: number; name: string } | null;
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

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, campusId } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(campusId ? { "X-Campus-Id": String(campusId) } : {}),
    },
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as { message?: string; errors?: Record<string, string[]> };
    throw new ApiError(
      errorPayload.message ?? response.statusText ?? "Request failed",
      response.status,
      errorPayload.errors
    );
  }

  return payload as T;
}
