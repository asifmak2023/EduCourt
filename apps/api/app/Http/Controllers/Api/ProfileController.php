<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource(
            $request->user()->load([
                'roles', 'permissions', 'campus', 'institution', 'scopeAssignments.campus', 'student',
            ])
        );
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        $user->forceFill(['password' => $data['password']])->save();

        $currentId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentId !== null, fn ($query) => $query->whereKeyNot($currentId))
            ->delete();

        activity('auth')->causedBy($user)->log('Password changed');

        return response()->json([
            'message' => 'Password updated. Other sessions were signed out.',
        ]);
    }
}
