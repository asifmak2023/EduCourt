<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($request->validated('device_name') ?? 'api')->plainTextToken;

        activity('auth')->causedBy($user)->withProperties(['ip' => $request->ip()])->log('User logged in');

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
}
