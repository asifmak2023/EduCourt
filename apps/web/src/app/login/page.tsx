"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { Icon } from "@/components/Icons";
import { BrandMark } from "@/components/BrandMark";

const METRICS = [
  { value: "250+", label: "landing.trust.campuses" },
  { value: "120K+", label: "landing.trust.students" },
  { value: "20+", label: "landing.trust.modules" },
];

const EQUALIZER = [38, 62, 46, 84, 58, 96, 70, 88, 52, 74];

export default function LoginPage() {
  const { user, loading, login, verifyTwoFactor } = useAuth();
  const { t } = useTranslation();
  const tr = useTr();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          : t("auth.failed")
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
          : t("auth.verifyFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="lw-obsidian relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 top-1/4 h-80 w-80 rounded-full bg-accent/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -start-20 bottom-0 h-72 w-72 rounded-full bg-mint/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <BrandMark className="h-11 w-11" priority />
          <div className="flex flex-col">
            <span className="brand-glow font-logo text-2xl font-bold tracking-tight">
              EduCourt
            </span>
            <span className="lw-pill mt-0.5 self-start bg-amber text-amber-foreground">
              {t("landing.hero.badge")}
            </span>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="lw-hero-title text-4xl leading-[1.1] text-obsidian-foreground xl:text-[44px]">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-obsidian-foreground/70">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-8 flex h-24 items-end gap-2">
            {EQUALIZER.map((height, index) => (
              <span
                key={index}
                className="lw-glow-mint w-2 flex-1 rounded-full bg-mint"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm"
              >
                <p className="lw-kpi-value text-xl text-obsidian-foreground">
                  {metric.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-obsidian-foreground/55">
                  {tr(metric.label)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-obsidian-foreground/50">
          <span className="h-2 w-2 rounded-full bg-mint" />
          {t("auth.tagline")}
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-10 w-10" priority />
            <span className="brand-glow font-logo text-2xl font-bold tracking-tight text-foreground">
              EduCourt
            </span>
          </div>

          <div className="rounded-[28px] border border-border-secondary bg-panel p-7 shadow-lw sm:p-9">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <h1 className="lw-hero-title mt-4 text-2xl text-foreground sm:text-3xl">
              {challengeToken ? t("auth.twoFactorPrompt") : t("auth.welcomeTitle")}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {challengeToken ? t("auth.recoveryHint") : t("auth.welcomeSubtitle")}
            </p>

            {challengeToken ? (
              <form className="mt-6 space-y-4" onSubmit={handleChallenge}>
                <div>
                  <label
                    htmlFor="code"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("auth.verificationCode")}
                  </label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    autoFocus
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-border-secondary bg-panel px-3 py-3 text-center text-lg tracking-[0.3em] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>

                {error ? (
                  <p className="rounded-2xl bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_6px_16px_-6px_var(--accent)] transition hover:-translate-y-px hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? t("auth.verifying") : t("auth.verify")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChallengeToken(null);
                    setCode("");
                    setError(null);
                  }}
                  className="w-full text-xs font-medium text-muted hover:text-foreground"
                >
                  {t("auth.backToSignIn")}
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("auth.email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-border-secondary bg-panel px-3 py-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("auth.password")}
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder={t("auth.passwordPlaceholder")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-border-secondary bg-panel px-3 py-3 pe-10 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                    />
                    {password ? (
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 end-3 flex items-center text-muted transition-colors hover:text-foreground"
                      >
                        <Icon
                          name={showPassword ? "eyeOff" : "eye"}
                          className="h-4 w-4"
                        />
                      </button>
                    ) : null}
                  </div>
                </div>

                {error ? (
                  <p className="rounded-2xl bg-danger-soft px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_6px_16px_-6px_var(--accent)] transition hover:-translate-y-px hover:bg-accent-hover disabled:opacity-60"
                >
                  {submitting ? t("auth.signingIn") : t("auth.signIn")}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
