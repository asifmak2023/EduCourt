<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TimetableSlotResource;
use App\Models\ClassRoom;
use App\Models\TimetableSlot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TimetableViewController extends Controller
{
    public function classes(Request $request, ClassRoom $classRoom): AnonymousResourceCollection
    {
        $filters = $this->validateFilters($request, $classRoom->id);

        $query = $this->scoped($request)
            ->where('class_room_id', $classRoom->id)
            ->when($filters['section_id'] ?? null, fn (Builder $q, $sectionId) => $q->where('section_id', $sectionId));

        return TimetableSlotResource::collection($this->resolve($request, $query, $filters));
    }

    public function teachers(Request $request, User $user): AnonymousResourceCollection
    {
        $filters = $this->validateFilters($request);

        $query = $this->scoped($request)->where('teacher_user_id', $user->id);

        return TimetableSlotResource::collection($this->resolve($request, $query, $filters));
    }

    public function me(Request $request): AnonymousResourceCollection
    {
        $filters = $this->validateFilters($request);

        $query = $this->scoped($request)->where('teacher_user_id', $request->user()->id);

        return TimetableSlotResource::collection($this->resolve($request, $query, $filters));
    }

    private function scoped(Request $request): Builder
    {
        return TimetableSlot::query()
            ->when($request->filled('academic_year_id'), fn (Builder $q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('term_id'), fn (Builder $q) => $q->where('term_id', $request->integer('term_id')))
            ->orderBy('day_of_week')
            ->orderBy('period_id');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function resolve(Request $request, Builder $query, array $filters): Collection
    {
        if (! $this->canViewDrafts($request)) {
            $query->where('is_published', true);
        }

        return $query
            ->with(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])
            ->get();
    }

    private function canViewDrafts(Request $request): bool
    {
        return $request->user() !== null && $request->user()->can('timetable.approve');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateFilters(Request $request, ?int $classRoomId = null): array
    {
        return $request->validate([
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id'),
            ],
            'term_id' => ['nullable', 'integer', Rule::exists('terms', 'id')],
            'section_id' => [
                'nullable', 'integer',
                Rule::exists('sections', 'id')->where('class_room_id', $classRoomId ?? $request->integer('class_room_id')),
            ],
        ]);
    }
}
