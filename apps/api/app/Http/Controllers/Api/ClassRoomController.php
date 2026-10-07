<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClassRoomResource;
use App\Models\ClassRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ClassRoomController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $classes = ClassRoom::query()
            ->with(['stage', 'sections'])
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('stage_id'), fn ($q) => $q->where('stage_id', $request->integer('stage_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->whereHas('sections', fn ($s) => $s->where('id', $request->integer('section_id'))))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sequence')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return ClassRoomResource::collection($classes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $class = ClassRoom::create($data);

        return (new ClassRoomResource($class->load(['stage', 'sections'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ClassRoom $classRoom): ClassRoomResource
    {
        return new ClassRoomResource($classRoom->load(['stage', 'sections', 'inCharge']));
    }

    public function update(Request $request, ClassRoom $classRoom): ClassRoomResource
    {
        $data = $request->validate($this->rules($classRoom->campus_id, $classRoom->id, false));

        $classRoom->update($data);

        return new ClassRoomResource($classRoom->load(['stage', 'sections']));
    }

    public function destroy(ClassRoom $classRoom): JsonResponse
    {
        $classRoom->delete();

        return response()->json(['message' => 'Class archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'stage_id' => [
                $presence, 'integer',
                Rule::exists('stages', 'id')->where('campus_id', $campusId),
            ],
            'name' => [$presence, 'string', 'max:128'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('class_rooms', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'capacity' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'room' => ['nullable', 'string', 'max:64'],
            'in_charge_user_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
