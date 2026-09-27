<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Manages authenticator-app two-factor enrolment and the login challenge that
 * stands between a correct password and an issued API token.
 */
class TwoFactorService
{
    public function __construct(private readonly Totp $totp) {}

    /**
     * Start enrolment by generating (but not yet confirming) a secret and a set
     * of single-use recovery codes.
     *
     * @return array{secret: string, otpauth_url: string, recovery_codes: array<int, string>}
     */
    public function beginEnrolment(User $user): array
    {
        if ($user->hasTwoFactorEnabled()) {
            abort(409, 'Two-factor authentication is already enabled.');
        }

        $secret = $this->totp->generateSecret();
        $recoveryCodes = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => $this->hashRecoveryCodes($recoveryCodes),
            'two_factor_confirmed_at' => null,
        ])->save();

        return [
            'secret' => $secret,
            'otpauth_url' => $this->totp->provisioningUri($secret, $user->email),
            'recovery_codes' => $recoveryCodes,
        ];
    }

    public function confirmEnrolment(User $user, string $code): void
    {
        if ($user->two_factor_secret === null) {
            throw ValidationException::withMessages([
                'code' => 'Start two-factor setup before confirming it.',
            ]);
        }

        if ($user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'code' => 'Two-factor authentication is already confirmed.',
            ]);
        }

        if (! $this->totp->verify((string) $user->two_factor_secret, $code)) {
            throw ValidationException::withMessages([
                'code' => 'The verification code is invalid.',
            ]);
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    /**
     * @return array<int, string>
     */
    public function regenerateRecoveryCodes(User $user): array
    {
        if (! $user->hasTwoFactorEnabled()) {
            abort(409, 'Two-factor authentication is not enabled.');
        }

        $codes = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_recovery_codes' => $this->hashRecoveryCodes($codes),
        ])->save();

        return $codes;
    }

    public function issueChallenge(User $user): string
    {
        $token = Str::random(64);

        Cache::put(
            $this->challengeKey($token),
            $user->id,
            (int) config('security.two_factor.challenge_ttl', 300),
        );

        return $token;
    }

    /**
     * Verify a challenge token against a TOTP code or a recovery code. The
     * challenge is consumed on success so it cannot be replayed.
     */
    public function completeChallenge(string $token, string $code): User
    {
        $userId = Cache::get($this->challengeKey($token));
        $user = $userId === null ? null : User::find($userId);

        if ($user === null || ! $user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'code' => 'This login challenge has expired. Please sign in again.',
            ]);
        }

        $code = trim($code);

        if ($this->totp->verify((string) $user->two_factor_secret, $code)) {
            Cache::forget($this->challengeKey($token));

            return $user;
        }

        if ($this->consumeRecoveryCode($user, $code)) {
            Cache::forget($this->challengeKey($token));

            return $user;
        }

        throw ValidationException::withMessages([
            'code' => 'The verification code is invalid.',
        ]);
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];

        foreach ($codes as $index => $hashed) {
            if (! Hash::check($code, $hashed)) {
                continue;
            }

            unset($codes[$index]);
            $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

            return true;
        }

        return false;
    }

    /**
     * @return array<int, string>
     */
    private function generateRecoveryCodes(): array
    {
        $count = (int) config('security.two_factor.recovery_codes', 8);

        return collect(range(1, $count))
            ->map(fn (): string => strtoupper(Str::random(5).'-'.Str::random(5)))
            ->all();
    }

    /**
     * @param  array<int, string>  $codes
     * @return array<int, string>
     */
    private function hashRecoveryCodes(array $codes): array
    {
        return array_map(fn (string $code): string => Hash::make($code), $codes);
    }

    private function challengeKey(string $token): string
    {
        return 'two_factor:challenge:'.hash('sha256', $token);
    }
}
