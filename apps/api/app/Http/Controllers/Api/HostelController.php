<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\HostelResource;
use App\Models\Hostel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class HostelController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $hostels = Hostel::query()
            ->with('warden')
            ->withCount('rooms')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return HostelResource::collection($hostels);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $hostel = Hostel::create($data + $tenant);

        return (new HostelResource($hostel->load('warden')))->response()->setStatusCode(201);
    }

    public function show(Hostel $hostel): HostelResource
    {
        return new HostelResource($hostel->load(['warden', 'rooms']));
    }

    public function update(Request $request, Hostel $hostel): HostelResource
    {
        $hostel->update($request->validate($this->rules(false)));

        return new HostelResource($hostel->refresh()->load('warden')->loadCount('rooms'));
    }

    public function destroy(Hostel $hostel): JsonResponse
    {
        $hostel->delete();

        return response()->json(['message' => 'Hostel removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [$presence, 'string', 'max:32'],
            'type' => ['sometimes', Rule::in(['boys', 'girls', 'mixed'])],
            'warden_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'warden_name' => ['nullable', 'string', 'max:255'],
            'warden_phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
