"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { IconEye, IconEyeOff, IconLock, IconMail, IconSchool, IconSpark } from "@/components/Icons";

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
      <section className="relative hidden overflow-hidden bg-[#12142a] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(40rem 30rem at 20% 10%, rgba(124,116,255,0.55), transparent 60%), radial-gradient(36rem 26rem at 90% 80%, rgba(56,189,248,0.35), transparent 55%), radial-gradient(30rem 24rem at 60% 120%, rgba(248,190,40,0.18), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white backdrop-blur">
            <IconSchool width={22} height={22} />
          </span>
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
              EduCourt Family
            </p>
            <p className="text-xs text-white/60">School, in your pocket</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight text-white">
            Everything about your child&apos;s school day, beautifully clear.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Attendance, results, fees and the timetable — one calm place for
            parents and students. No clutter, no noise.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "Attendance", value: "Live" },
              { label: "Results", value: "Clear" },
              { label: "Fees", value: "Simple" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
              >
                <p className="text-xs uppercase tracking-wide text-white/50">
                  {item.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">
          Secured by EduCourt. Your child&apos;s data stays private.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white">
              <IconSchool width={22} height={22} />
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold">
                EduCourt Family
              </p>
              <p className="text-xs text-muted">School, in your pocket</p>
            </div>
          </div>

          <div className="mb-6">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              <IconSpark width={13} height={13} /> Family portal
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
              {challengeToken ? "Enter your code" : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {challengeToken
                ? "Open your authenticator app and enter the 6-digit code."
                : "Sign in with the email your school gave you."}
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
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
                  className="w-full rounded-2xl border bg-panel px-4 py-3 text-center text-lg tracking-[0.4em] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || code.length < 6}
                className="w-full rounded-2xl bg-brand py-3 font-semibold text-brand-foreground transition hover:opacity-95 disabled:opacity-50"
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
                    className="w-full rounded-2xl border bg-panel py-3 pl-11 pr-4 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                    className="w-full rounded-2xl border bg-panel py-3 pl-11 pr-11 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
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
                className="w-full rounded-2xl bg-brand py-3 font-semibold text-brand-foreground transition hover:opacity-95 disabled:opacity-50"
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
