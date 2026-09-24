<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\GuardianResource;
use App\Models\Guardian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GuardianController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $guardians = Guardian::query()
            ->withCount('students')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('national_id', 'like', "%{$search}%");
            }))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return GuardianResource::collection($guardians);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules());
        $data += $tenant;

        $guardian = Guardian::create($data);

        return (new GuardianResource($guardian))->response()->setStatusCode(201);
    }

    public function show(Guardian $guardian): GuardianResource
    {
        return new GuardianResource($guardian->load('students'));
    }

    public function update(Request $request, Guardian $guardian): GuardianResource
    {
        $data = $request->validate($this->rules(false));

        $guardian->update($data);

        return new GuardianResource($guardian);
    }

    public function destroy(Guardian $guardian): JsonResponse
    {
        $guardian->students()->detach();
        $guardian->delete();

        return response()->json(['message' => 'Guardian archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:191'],
            'national_id' => ['nullable', 'string', 'max:64'],
            'occupation' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:191'],
            'phone' => [$presence, 'string', 'max:32'],
            'alternate_phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
