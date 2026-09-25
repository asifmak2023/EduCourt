<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        $sessions = $request->user()->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
                'is_current' => $token->id === $currentId,
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $deleted = $request->user()->tokens()->whereKey($token)->delete();

        if ($deleted === 0) {
            abort(404, 'Session not found.');
        }

        activity('auth')->causedBy($request->user())->log('Session revoked');

        return response()->json(['message' => 'Session revoked.']);
    }

    public function destroyOthers(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;

        $count = $request->user()->tokens()
            ->when($currentId !== null, fn ($query) => $query->whereKeyNot($currentId))
            ->delete();

        activity('auth')->causedBy($request->user())->log('Other sessions revoked');

        return response()->json([
            'message' => 'Other sessions revoked.',
            'revoked' => $count,
        ]);
    }
}
