<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SectionResource;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SectionController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $sections = Section::query()
            ->with('classRoom')
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('class_room_id')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return SectionResource::collection($sections);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $section = Section::create($data);

        return (new SectionResource($section->load('classRoom')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Section $section): SectionResource
    {
        return new SectionResource($section->load(['classRoom', 'inCharge']));
    }

    public function update(Request $request, Section $section): SectionResource
    {
        $data = $request->validate($this->rules(
            $section->campus_id,
            $request->integer('class_room_id') ?: $section->class_room_id,
            $section->id,
            false,
        ));

        $section->update($data);

        return new SectionResource($section->load('classRoom'));
    }

    public function destroy(Section $section): JsonResponse
    {
        $section->delete();

        return response()->json(['message' => 'Section archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $classRoomId = null, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId),
            ],
            'name' => [
                $presence, 'string', 'max:64',
                Rule::unique('sections', 'name')
                    ->where(fn ($query) => $query->where('class_room_id', $classRoomId ?? request()->integer('class_room_id')))
                    ->ignore($ignoreId),
            ],
            'capacity' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'in_charge_user_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
