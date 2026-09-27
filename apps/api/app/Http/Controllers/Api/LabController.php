<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LabResource;
use App\Models\Lab;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class LabController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $labs = Lab::query()
            ->with('incharge')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return LabResource::collection($labs);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $lab = Lab::create($data + $tenant);

        return (new LabResource($lab->load('incharge')))->response()->setStatusCode(201);
    }

    public function show(Lab $lab): LabResource
    {
        return new LabResource($lab->load(['incharge', 'equipment']));
    }

    public function update(Request $request, Lab $lab): LabResource
    {
        $lab->update($request->validate($this->rules(false)));

        return new LabResource($lab->refresh()->load('incharge'));
    }

    public function destroy(Lab $lab): JsonResponse
    {
        $lab->delete();

        return response()->json(['message' => 'Lab removed.']);
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
            'type' => ['sometimes', Rule::in(['science', 'computer', 'language', 'other'])],
            'location' => ['nullable', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:0'],
            'incharge_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
