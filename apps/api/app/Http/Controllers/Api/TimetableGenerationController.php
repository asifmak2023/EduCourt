<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\TimetableSlot;
use App\Services\Timetable\TimetableGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TimetableGenerationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TimetableGenerator $generator) {}

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'term_id' => ['nullable', 'integer'],
            'class_room_id' => [
                'nullable', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'section_id' => ['nullable', 'integer'],
            'days' => ['nullable', 'array', 'min:1', 'max:7'],
            'days.*' => ['integer', 'between:1,7', 'distinct'],
            'replace' => ['sometimes', 'boolean'],
            'dry_run' => ['sometimes', 'boolean'],
            'max_per_subject_per_day' => ['sometimes', 'integer', 'between:1,3'],
            'room_id' => ['nullable', 'integer'],
        ]);

        $result = $this->generator->generate(
            $tenant,
            (int) $data['academic_year_id'],
            $data['term_id'] ?? null,
            $data['days'] ?? [1, 2, 3, 4, 5],
            $data['class_room_id'] ?? null,
            $data['section_id'] ?? null,
            (bool) ($data['replace'] ?? false),
            (bool) ($data['dry_run'] ?? false),
            (int) ($data['max_per_subject_per_day'] ?? 1),
            $data['room_id'] ?? null,
        );

        if (! ($data['dry_run'] ?? false)) {
            $result['slots'] = TimetableSlot::query()
                ->with(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])
                ->whereIn('id', $result['slot_ids'])
                ->orderBy('day_of_week')
                ->orderBy('period_id')
                ->get();
        }

        return response()->json(['data' => $result], ($data['dry_run'] ?? false) ? 200 : 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'academic_year_id' => ['required', 'integer'],
            'term_id' => ['nullable', 'integer'],
            'class_room_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer'],
            'include_published' => ['sometimes', 'boolean'],
        ]);

        $removed = $this->generator->clear(
            (int) $data['academic_year_id'],
            $data['term_id'] ?? null,
            $data['class_room_id'] ?? null,
            $data['section_id'] ?? null,
            (bool) ($data['include_published'] ?? false),
        );

        return response()->json([
            'message' => 'Timetable slots cleared.',
            'removed' => $removed,
        ]);
    }
}
