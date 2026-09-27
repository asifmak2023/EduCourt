<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\TwoFactorService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function login(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::where('email', $request->validated('email'))->first();

        if ($user === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $user->is_active) {
            abort(403, 'This account is inactive. Contact your administrator.');
        }

        if (config('security.enforce_two_factor')
            && $user->requiresTwoFactor()
            && ! $user->hasTwoFactorEnabled()) {
            return response()->json([
                'message' => 'Two-factor authentication must be enabled before login.',
                'two_factor_setup_required' => true,
            ], 409);
        }

        if ($user->hasTwoFactorEnabled()) {
            $challenge = $this->twoFactor->issueChallenge($user);

            $user->forceFill(['last_login_at' => now()])->save();

            activity('auth')->causedBy($user)->withProperties(['ip' => $request->ip(), 'stage' => 'password'])->log('Password accepted, two-factor challenge issued');

            return response()->json([
                'message' => 'Two-factor verification required.',
                'two_factor_required' => true,
                'challenge_token' => $challenge,
                'expires_in' => (int) config('security.two_factor.challenge_ttl', 300),
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($request->validated('device_name') ?? 'api')->plainTextToken;

        activity('auth')->causedBy($user)->withProperties(['ip' => $request->ip()])->log('User logged in');

        $user->load(['roles', 'permissions', 'campus', 'institution', 'scopeAssignments']);

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function twoFactorChallenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $this->twoFactor->completeChallenge($validated['challenge_token'], $validated['code']);

        if (! $user->is_active) {
            abort(403, 'This account is inactive. Contact your administrator.');
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($validated['device_name'] ?? 'api')->plainTextToken;

        activity('auth')->causedBy($user)->withProperties(['ip' => $request->ip(), 'two_factor' => true])->log('User logged in');

        $user->load(['roles', 'permissions', 'campus', 'institution', 'scopeAssignments']);

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        $token?->delete();

        activity('auth')->causedBy($request->user())->log('User logged out');

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => __($status)]);
        }

        throw ValidationException::withMessages(['email' => [__($status)]]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)]);
        }

        throw ValidationException::withMessages(['email' => [__($status)]]);
    }

    public function sendVerificationEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification link sent.']);
    }

    public function verifyEmail(Request $request, string $id, string $hash): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            abort(403, 'Invalid verification link.');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            activity('auth')->causedBy($user)->log('Email verified');

            event(new Verified($user));
        }

        return response()->json(['message' => 'Email verified.']);
    }
}
