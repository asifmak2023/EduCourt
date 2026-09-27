<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\SsoProvider;
use App\Services\Sso\SsoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SsoAuthController extends Controller
{
    public function __construct(private readonly SsoService $sso) {}

    public function authorize(SsoProvider $provider): JsonResponse
    {
        return response()->json(['data' => $this->sso->begin($provider)]);
    }

    public function callback(Request $request, SsoProvider $provider): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $result = $this->sso->complete($provider, $data['state'], $data['code'], $data['device_name'] ?? null);

        return response()->json([
            'token' => $result['token'],
            'id_token' => $result['id_token'],
            'user' => new UserResource($result['user']),
        ]);
    }

    public function logout(Request $request, SsoProvider $provider): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['nullable', 'string'],
            'post_logout_redirect' => ['nullable', 'url', 'max:500'],
        ]);

        $request->user()->currentAccessToken()?->delete();

        activity('auth')->causedBy($request->user())->log('User logged out via SSO');

        return response()->json([
            'logout_url' => $this->sso->logoutUrl($provider, $data['id_token'] ?? null, $data['post_logout_redirect'] ?? ''),
        ]);
    }
}
