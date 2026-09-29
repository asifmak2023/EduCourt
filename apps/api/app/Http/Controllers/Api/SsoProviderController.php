<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\SsoProviderResource;
use App\Models\SsoProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SsoProviderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $providers = SsoProvider::query()
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return SsoProviderResource::collection($providers);
    }

    public function store(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);

        $rules = $this->rules();
        $rules['name'] = [
            'required', 'string', 'max:100',
            Rule::unique('sso_providers', 'name')
                ->where(fn ($query) => $query->where('institution_id', $institutionId)),
        ];

        $data = $request->validate($rules);
        $data['institution_id'] = $institutionId;

        $provider = SsoProvider::create($data);

        return (new SsoProviderResource($provider))->response()->setStatusCode(201);
    }

    public function show(SsoProvider $provider): SsoProviderResource
    {
        return new SsoProviderResource($provider);
    }

    public function update(Request $request, SsoProvider $provider): SsoProviderResource
    {
        $rules = $this->rules(false);
        $rules['name'] = [
            'required', 'string', 'max:100',
            Rule::unique('sso_providers', 'name')
                ->where(fn ($query) => $query->where('institution_id', $provider->institution_id))
                ->ignore($provider->id),
        ];

        $data = $request->validate($rules);
        unset($data['institution_id']);

        if (! array_key_exists('client_secret', $data)) {
            unset($data['client_secret']);
        }

        $provider->update($data);

        return new SsoProviderResource($provider->refresh());
    }

    public function destroy(SsoProvider $provider): JsonResponse
    {
        $provider->delete();

        return response()->json(['message' => 'SSO provider removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $creating = true): array
    {
        return [
            'institution_id' => [
                Rule::requiredIf(fn () => $creating && request()->user()?->isPlatformAdmin()),
                'integer', Rule::exists('institutions', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:100'],
            'provider' => ['nullable', Rule::in(['oidc'])],
            'client_id' => ['required', 'string', 'max:255'],
            'client_secret' => [$creating ? 'required' : 'nullable', 'string', 'max:1000'],
            'authorize_url' => ['required', 'url', 'max:500'],
            'token_url' => ['required', 'url', 'max:500'],
            'userinfo_url' => ['required', 'url', 'max:500'],
            'logout_url' => ['nullable', 'url', 'max:500'],
            'redirect_uri' => ['required', 'url', 'max:500'],
            'scopes' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'jit_provisioning' => ['sometimes', 'boolean'],
            'default_role' => ['nullable', Rule::enum(RoleName::class)],
        ];
    }

    private function institutionId(Request $request): int
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return (int) $request->integer('institution_id');
        }

        if ($user->institution_id === null) {
            abort(403, 'Your account is not linked to an institution.');
        }

        return (int) $user->institution_id;
    }
}
