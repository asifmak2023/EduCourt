"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@eis/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icons";

export default function LoginPage() {
  const { user, loading, login, verifyTwoFactor } = useAuth();
  const { t } = useTranslation();
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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border-secondary bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.brand")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {challengeToken
            ? t("auth.twoFactorPrompt")
            : t("auth.tagline")}
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
                className="mt-1 w-full rounded-lg border border-border-secondary px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1 text-xs text-muted">
                {t("auth.recoveryHint")}
              </p>
            </div>

            {error ? (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
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
          <>
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
                  className="mt-1 w-full rounded-lg border border-border-secondary px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                    className="w-full rounded-lg border border-border-secondary px-3 py-2 pe-10 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
              >
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
