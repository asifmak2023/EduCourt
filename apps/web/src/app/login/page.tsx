"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { label: "Super User", email: "superadmin@demo-eis.test" },
  { label: "Campus admin", email: "campusadmin@demo-eis.test" },
  { label: "Teacher", email: "teacher@demo-eis.test" },
];

export default function LoginPage() {
  const { user, loading, login, verifyTwoFactor } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.status === "two_factor_required") {
        setChallengeToken(result.challengeToken);
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challengeToken) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await verifyTwoFactor(challengeToken, code);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to verify the code. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Education Information System
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {challengeToken
            ? "Enter the 6-digit code from your authenticator app."
            : "Sign in to your campus dashboard."}
        </p>

        {challengeToken ? (
          <form className="mt-6 space-y-4" onSubmit={handleChallenge}>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700"
              >
                Verification code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
              <p className="mt-1 text-xs text-slate-400">
                You can also enter one of your recovery codes.
              </p>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
            >
              {submitting ? "Verifying..." : "Verify and sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setChallengeToken(null);
                setCode("");
                setError(null);
              }}
              className="w-full text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Demo accounts (password: password)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword("password");
                      setError(null);
                    }}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
