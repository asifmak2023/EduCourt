<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItSystemResource;
use App\Models\ItSystem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ItSystemController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $systems = ItSystem::query()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return ItSystemResource::collection($systems);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $system = ItSystem::create($data + $tenant + [
            'type' => $data['type'] ?? 'portal',
            'status' => $data['status'] ?? 'up',
        ]);

        return (new ItSystemResource($system))->response()->setStatusCode(201);
    }

    public function show(ItSystem $system): ItSystemResource
    {
        return new ItSystemResource($system);
    }

    public function update(Request $request, ItSystem $system): ItSystemResource
    {
        $system->update($request->validate($this->rules(false)));

        return new ItSystemResource($system);
    }

    public function destroy(ItSystem $system): JsonResponse
    {
        $system->delete();

        return response()->json(['message' => 'System removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['portal', 'website', 'email', 'dns', 'network', 'other'])],
            'url' => ['nullable', 'string', 'max:255'],
            'owner' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['up', 'degraded', 'down', 'maintenance'])],
            'uptime_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'last_checked_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
