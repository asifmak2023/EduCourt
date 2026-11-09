"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  IconClock,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconSchool,
  IconUser,
} from "@/components/Icons";

export default function LoginPage() {
  const { login, verifyTwoFactor } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

      router.replace("/portal");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We could not sign you in. Please check your details."
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
      router.replace("/portal");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "That code was not accepted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ===== Chalkboard side ===== */}
      <section className="chalk-board relative hidden flex-col justify-between overflow-hidden p-12 text-board-ink lg:flex">
        {/* faint ruled chalk lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 47px, rgba(255,255,255,0.9) 47px 48px)",
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-board-ink">
            <IconSchool width={22} height={22} />
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase leading-none tracking-tight">
              EduCourt<span className="text-marigold">.</span>
            </p>
            <p className="mt-1 text-xs text-board-dim">Family portal</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="font-urdu text-2xl text-board-dim">خاندان</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-bold uppercase leading-[0.92] tracking-tight">
            The whole school day,
            <br />
            on one board.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-board-dim">
            Attendance, timetable, results and fees — a calm, clear place for
            parents and students.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {["Attendance", "Timetable", "Results", "Fees"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/15 px-3 py-1 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wide text-board-ink"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative flex items-center gap-1.5 text-xs text-board-dim">
          <IconClock width={14} height={14} />
          Secured by EduCourt. Your child&apos;s data stays private.
        </p>
      </section>

      {/* ===== Paper form side ===== */}
      <section className="flex items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sidebar text-board-ink">
              <IconSchool width={22} height={22} />
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase leading-none tracking-tight">
                EduCourt<span className="text-marigold">.</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">Family portal</p>
            </div>
          </div>

          <div className="mb-6">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 text-xs font-semibold text-primary">
              <IconUser width={13} height={13} /> Parent &amp; student
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
              {challengeToken ? "Enter code" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {challengeToken
                ? "Open your authenticator app and enter the 6-digit code."
                : "Sign in with the email your school gave you."}
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          {challengeToken ? (
            <form onSubmit={handleChallenge} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">
                  Verification code
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                  className="w-full rounded-lg border border-hairline bg-card px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition focus:border-primary focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || code.length < 6}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify and continue"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChallengeToken(null);
                  setCode("");
                  setError(null);
                }}
                className="w-full text-sm text-muted hover:text-foreground"
              >
                Use a different account
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">
                  Email
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <IconMail width={18} height={18} />
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-hairline bg-card py-3 pl-11 pr-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-foreground">
                  Password
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <IconLock width={18} height={18} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    className="w-full rounded-lg border border-hairline bg-card py-3 pl-11 pr-11 outline-none transition focus:border-primary focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_15%,transparent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Need help signing in? Contact your school office.
            <br />
            Staff and administrators should use the main EduCourt site.
          </p>
        </div>
      </section>
    </main>
  );
}
