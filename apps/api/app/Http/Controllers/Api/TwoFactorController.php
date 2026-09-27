<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Auth\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authenticator-app enrolment and recovery-code management for the signed-in
 * user.
 */
class TwoFactorController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function enable(Request $request): JsonResponse
    {
        $payload = $this->twoFactor->beginEnrolment($request->user());

        activity('auth')->causedBy($request->user())->log('Two-factor enrolment started');

        return response()->json([
            'message' => 'Scan the provisioning URI in your authenticator app, then confirm with a code.',
            'secret' => $payload['secret'],
            'otpauth_url' => $payload['otpauth_url'],
            'recovery_codes' => $payload['recovery_codes'],
        ], 201);
    }

    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $this->twoFactor->confirmEnrolment($request->user(), $validated['code']);

        activity('auth')->causedBy($request->user())->log('Two-factor authentication enabled');

        return response()->json([
            'message' => 'Two-factor authentication enabled.',
            'two_factor_enabled' => true,
        ]);
    }

    public function disable(Request $request): JsonResponse
    {
        $this->confirmPassword($request);

        $this->twoFactor->disable($request->user());

        activity('auth')->causedBy($request->user())->log('Two-factor authentication disabled');

        return response()->json([
            'message' => 'Two-factor authentication disabled.',
            'two_factor_enabled' => false,
        ]);
    }

    public function recoveryCodes(Request $request): JsonResponse
    {
        $this->confirmPassword($request);

        $codes = $this->twoFactor->regenerateRecoveryCodes($request->user());

        activity('auth')->causedBy($request->user())->log('Two-factor recovery codes regenerated');

        return response()->json(['recovery_codes' => $codes]);
    }

    private function confirmPassword(Request $request): void
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check((string) $request->input('password'), $request->user()->password)) {
            throw ValidationException::withMessages([
                'password' => 'The provided password is incorrect.',
            ]);
        }
    }
}
