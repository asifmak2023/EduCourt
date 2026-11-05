import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";
const TOKEN_COOKIE = "eis_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

const HOP_BY_HOP = new Set([
  "connection",
  "content-length",
  "content-encoding",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildTarget(request: NextRequest, path: string[]): URL {
  const target = new URL(`${API_ORIGIN}/api/${path.join("/")}`);
  target.search = request.nextUrl.search;
  return target;
}

function forwardedHeaders(request: NextRequest, token: string | null): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (key === "host" || key === "cookie" || key === "authorization") {
      return;
    }

    if (HOP_BY_HOP.has(key.toLowerCase())) {
      return;
    }

    headers.set(key, value);
  });

  if (token !== null) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();

  upstream.headers.forEach((value, key) => {
    if (key === "set-cookie" || HOP_BY_HOP.has(key.toLowerCase())) {
      return;
    }

    headers.set(key, value);
  });

  return headers;
}

async function handle(request: NextRequest, path: string[]): Promise<Response> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value ?? null;

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(buildTarget(request, path), {
    method,
    body: body !== undefined && body.byteLength > 0 ? body : undefined,
    headers: forwardedHeaders(request, token),
    redirect: "manual",
    cache: "no-store",
  });

  const isAuthIssue =
    path[0] === "v1" &&
    path[1] === "auth" &&
    (path[2] === "login" || path[2] === "two-factor" || path[2] === "logout");

  if (isAuthIssue && upstream.ok) {
    const payload = await upstream.clone().json().catch(() => null);

    if (path[2] === "logout") {
      store.delete(TOKEN_COOKIE);
    } else if (payload !== null && typeof payload.token === "string") {
      store.set(TOKEN_COOKIE, payload.token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_SECONDS,
      });

      delete (payload as { token?: string }).token;

      return Response.json(payload, {
        status: upstream.status,
        headers: responseHeaders(upstream),
      });
    }
  }

  if (path[2] === "logout") {
    store.delete(TOKEN_COOKIE);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream),
  });
}

export async function GET(request: NextRequest, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function POST(request: NextRequest, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  return handle(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/[...path]">) {
  const { path } = await context.params;
  return handle(request, path);
}
