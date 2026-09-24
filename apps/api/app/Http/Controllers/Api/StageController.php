<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StageResource;
use App\Models\Stage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StageController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $stages = Stage::query()
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sequence')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return StageResource::collection($stages);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'code' => [
                'required', 'string', 'max:32',
                Rule::unique('stages', 'code')->where('campus_id', $tenant['campus_id']),
            ],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data += $tenant;

        $stage = Stage::create($data);

        return (new StageResource($stage))->response()->setStatusCode(201);
    }

    public function show(Stage $stage): StageResource
    {
        return new StageResource($stage->load('classRooms'));
    }

    public function update(Request $request, Stage $stage): StageResource
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:128'],
            'code' => [
                'sometimes', 'string', 'max:32',
                Rule::unique('stages', 'code')->where('campus_id', $stage->campus_id)->ignore($stage->id),
            ],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $stage->update($data);

        return new StageResource($stage);
    }

    public function destroy(Stage $stage): JsonResponse
    {
        $stage->delete();

        return response()->json(['message' => 'Stage archived.']);
    }
}
