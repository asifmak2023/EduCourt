<?php

namespace App\Services\Auth;

/**
 * Dependency-free RFC 6238 time-based one-time password implementation.
 *
 * Uses SHA-1 with a 6 digit code and a 30 second period, which is what the
 * common authenticator apps (Google Authenticator, Authy, 1Password) expect.
 * Verification accepts a small drift window so slightly out-of-sync clocks
 * still succeed.
 */
class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(int $bytes = 20): string
    {
        return $this->base32Encode(random_bytes($bytes));
    }

    public function verify(string $secret, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';

        if ($code === '' || ! ctype_digit($code)) {
            return false;
        }

        $window = (int) config('security.two_factor.window', 1);
        $counter = intdiv(time(), $this->period());

        for ($offset = -$window; $offset <= $window; $offset++) {
            if (hash_equals($this->code($secret, $counter + $offset), $code)) {
                return true;
            }
        }

        return false;
    }

    public function code(string $secret, int $counter): string
    {
        $key = $this->base32Decode($secret);
        $binary = pack('N*', 0).pack('N*', $counter);
        $hash = hash_hmac('sha1', $binary, $key, true);

        $offset = ord($hash[19]) & 0x0F;
        $value = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );

        $digits = $this->digits();
        $otp = $value % (10 ** $digits);

        return str_pad((string) $otp, $digits, '0', STR_PAD_LEFT);
    }

    public function provisioningUri(string $secret, string $account, ?string $issuer = null): string
    {
        $issuer ??= (string) config('security.two_factor.issuer', config('app.name'));
        $label = rawurlencode($issuer.':'.$account);

        $query = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => $this->digits(),
            'period' => $this->period(),
        ]);

        return "otpauth://totp/{$label}?{$query}";
    }

    public function currentCounter(): int
    {
        return intdiv(time(), $this->period());
    }

    private function period(): int
    {
        return (int) config('security.two_factor.period', 30);
    }

    private function digits(): int
    {
        return (int) config('security.two_factor.digits', 6);
    }

    private function base32Encode(string $bytes): string
    {
        $bits = '';

        foreach (str_split($bytes) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';

        foreach (str_split($bits, 5) as $chunk) {
            $encoded .= self::ALPHABET[bindec(str_pad($chunk, 5, '0', STR_PAD_RIGHT))];
        }

        return $encoded;
    }

    private function base32Decode(string $secret): string
    {
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $secret) ?? '');
        $bits = '';

        for ($i = 0; $i < strlen($secret); $i++) {
            $index = strpos(self::ALPHABET, $secret[$i]);

            if ($index === false) {
                continue;
            }

            $bits .= str_pad(decbin($index), 5, '0', STR_PAD_LEFT);
        }

        $decoded = '';

        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) < 8) {
                break;
            }

            $decoded .= chr(bindec($chunk));
        }

        return $decoded;
    }
}
