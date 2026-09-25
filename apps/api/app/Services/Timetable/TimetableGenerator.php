<?php

namespace App\Services\Timetable;

use App\Models\Period;
use App\Models\TeachingAssignment;
use App\Models\TimetableSlot;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Greedy timetable generator.
 *
 * Places each teaching assignment's weekly periods into free day/period cells
 * while respecting class, teacher and room availability. It is intentionally a
 * best-effort scheduler: anything it cannot place is reported as unplaced so it
 * can be scheduled by hand.
 */
class TimetableGenerator
{
    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<int, int>  $days
     * @return array<string, mixed>
     */
    public function generate(
        array $tenant,
        int $academicYearId,
        ?int $termId,
        array $days,
        ?int $classRoomId = null,
        ?int $sectionId = null,
        bool $replace = false,
        bool $dryRun = false,
        int $maxPerSubjectPerDay = 1,
        ?int $roomId = null,
    ): array {
        $periods = Period::query()
            ->where('campus_id', $tenant['campus_id'])
            ->where('is_active', true)
            ->where('is_break', false)
            ->orderBy('sequence')
            ->get();

        if ($periods->isEmpty()) {
            throw ValidationException::withMessages([
                'days' => ['No active teaching periods are defined for this campus.'],
            ]);
        }

        $assignments = TeachingAssignment::query()
            ->with('subject')
            ->where('academic_year_id', $academicYearId)
            ->where('is_active', true)
            ->when($classRoomId, fn ($q) => $q->where('class_room_id', $classRoomId))
            ->when($sectionId, fn ($q) => $q->where('section_id', $sectionId))
            ->orderBy('class_room_id')
            ->orderBy('section_id')
            ->get();

        if ($assignments->isEmpty()) {
            throw ValidationException::withMessages([
                'academic_year_id' => ['No active teaching assignments found for the selected scope.'],
            ]);
        }

        $scope = function ($query) use ($academicYearId, $termId, $classRoomId, $sectionId) {
            return $query
                ->where('academic_year_id', $academicYearId)
                ->when($termId !== null, fn ($q) => $q->where('term_id', $termId))
                ->when($termId === null, fn ($q) => $q->whereNull('term_id'))
                ->when($classRoomId, fn ($q) => $q->where('class_room_id', $classRoomId))
                ->when($sectionId, fn ($q) => $q->where('section_id', $sectionId));
        };

        $existing = $scope(TimetableSlot::query())->get();

        return DB::transaction(function () use (
            $tenant, $academicYearId, $termId, $days, $periods, $assignments,
            $replace, $dryRun, $maxPerSubjectPerDay, $roomId, $scope, $existing
        ) {
            $removed = 0;

            if ($replace) {
                if (! $dryRun) {
                    $removed = $scope(TimetableSlot::query())->delete();
                }

                $existing = collect();
            }

            $classBusy = [];
            $teacherBusy = [];
            $roomBusy = [];
            $subjectDay = [];

            foreach ($existing as $slot) {
                $classKey = $this->classKey((int) $slot->class_room_id, $slot->section_id !== null ? (int) $slot->section_id : null);
                $classBusy[$classKey][$slot->day_of_week][$slot->period_id] = true;

                if ($slot->teacher_user_id !== null) {
                    $teacherBusy[$slot->teacher_user_id][$slot->day_of_week][$slot->period_id] = true;
                }

                if ($slot->room_id !== null) {
                    $roomBusy[$slot->room_id][$slot->day_of_week][$slot->period_id] = true;
                }

                if ($slot->subject_id !== null) {
                    $subjectDay[$classKey][$slot->subject_id][$slot->day_of_week] =
                        ($subjectDay[$classKey][$slot->subject_id][$slot->day_of_week] ?? 0) + 1;
                }
            }

            $created = [];
            $classes = [];

            $grouped = $assignments->groupBy(fn (TeachingAssignment $a) => $this->classKey((int) $a->class_room_id, $a->section_id !== null ? (int) $a->section_id : null))
                ->sortKeys();

            foreach ($grouped as $classKey => $classAssignments) {
                $demand = $classAssignments->map(function (TeachingAssignment $a) {
                    $weekly = (int) ($a->weekly_periods ?: ($a->subject->weekly_periods ?? 1));

                    return [
                        'subject_id' => (int) $a->subject_id,
                        'teacher_user_id' => $a->teacher_user_id !== null ? (int) $a->teacher_user_id : null,
                        'required' => max(1, $weekly),
                        'remaining' => max(1, $weekly),
                    ];
                })->values()->all();

                $required = array_sum(array_column($demand, 'required'));
                $placed = 0;
                $unplaced = [];

                while (true) {
                    $index = $this->nextIndex($demand);

                    if ($index === null) {
                        break;
                    }

                    $item = $demand[$index];

                    $slot = $this->place(
                        $tenant, $academicYearId, $termId, $days, $periods, $item,
                        $classKey, $roomId, $maxPerSubjectPerDay,
                        $classBusy, $teacherBusy, $roomBusy, $subjectDay,
                        $dryRun,
                    );

                    if ($slot === null) {
                        $unplaced[] = ['subject_id' => $item['subject_id'], 'periods' => $item['remaining']];
                        $demand[$index]['remaining'] = 0;

                        continue;
                    }

                    $demand[$index]['remaining']--;
                    $placed++;
                    $created[] = $slot;
                }

                $classes[] = [
                    'class_room_id' => (int) explode(':', $classKey)[0],
                    'section_id' => (int) explode(':', $classKey)[1] ?: null,
                    'required' => $required,
                    'placed' => $placed,
                    'unplaced' => $unplaced,
                ];
            }

            return [
                'academic_year_id' => $academicYearId,
                'term_id' => $termId,
                'days' => $days,
                'dry_run' => $dryRun,
                'replaced' => $replace,
                'removed' => $removed,
                'created' => count($created),
                'classes' => $classes,
                'slot_ids' => array_values(array_filter(array_map(fn ($s) => $s['id'] ?? null, $created))),
            ];
        });
    }

    /**
     * Delete unpublished timetable slots within a scope.
     *
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    public function clear(int $academicYearId, ?int $termId, ?int $classRoomId = null, ?int $sectionId = null, bool $includePublished = false): int
    {
        return TimetableSlot::query()
            ->where('academic_year_id', $academicYearId)
            ->when($termId !== null, fn ($q) => $q->where('term_id', $termId))
            ->when($termId === null, fn ($q) => $q->whereNull('term_id'))
            ->when($classRoomId, fn ($q) => $q->where('class_room_id', $classRoomId))
            ->when($sectionId, fn ($q) => $q->where('section_id', $sectionId))
            ->when(! $includePublished, fn ($q) => $q->where('is_published', false))
            ->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $demand
     */
    private function nextIndex(array $demand): ?int
    {
        $best = null;
        $bestRemaining = 0;

        foreach ($demand as $index => $item) {
            if ($item['remaining'] > $bestRemaining) {
                $best = $index;
                $bestRemaining = $item['remaining'];
            }
        }

        return $best;
    }

    /**
     * @param  array<int, int>  $days
     * @param  Collection<int, Period>  $periods
     * @param  array<string, mixed>  $item
     * @param  array<string, array<int, array<int, bool>>>  $classBusy
     * @param  array<int, array<int, array<int, bool>>>  $teacherBusy
     * @param  array<int, array<int, array<int, bool>>>  $roomBusy
     * @param  array<string, array<int, array<int, int>>>  $subjectDay
     * @return array<string, mixed>|null
     */
    private function place(
        array $tenant,
        int $academicYearId,
        ?int $termId,
        array $days,
        $periods,
        array $item,
        string $classKey,
        ?int $roomId,
        int $maxPerSubjectPerDay,
        array &$classBusy,
        array &$teacherBusy,
        array &$roomBusy,
        array &$subjectDay,
        bool $dryRun,
    ): ?array {
        [$classRoomId, $sectionId] = array_map('intval', explode(':', $classKey));
        $sectionId = $sectionId ?: null;

        $candidates = [];

        foreach ($days as $day) {
            foreach ($periods as $period) {
                $periodId = (int) $period->id;

                if ($classBusy[$classKey][$day][$periodId] ?? false) {
                    continue;
                }

                $teacherId = $item['teacher_user_id'];

                if ($teacherId !== null && ($teacherBusy[$teacherId][$day][$periodId] ?? false)) {
                    continue;
                }

                if (($subjectDay[$classKey][$item['subject_id']][$day] ?? 0) >= $maxPerSubjectPerDay) {
                    continue;
                }

                $candidates[] = [
                    'day' => $day,
                    'period_id' => $periodId,
                    'sequence' => (int) $period->sequence,
                    'subject_count' => $subjectDay[$classKey][$item['subject_id']][$day] ?? 0,
                    'teacher_load' => $teacherId !== null ? count($teacherBusy[$teacherId] ?? []) : 0,
                ];
            }
        }

        if ($candidates === []) {
            return null;
        }

        usort($candidates, fn ($a, $b) => [$a['subject_count'], $a['sequence'], $a['day']]
            <=> [$b['subject_count'], $b['sequence'], $b['day']]);

        $choice = $candidates[0];
        $day = $choice['day'];
        $periodId = $choice['period_id'];

        $roomChoice = null;

        if ($roomId !== null && ! ($roomBusy[$roomId][$day][$periodId] ?? false)) {
            $roomChoice = $roomId;
        }

        $classBusy[$classKey][$day][$periodId] = true;

        if ($item['teacher_user_id'] !== null) {
            $teacherBusy[$item['teacher_user_id']][$day][$periodId] = true;
        }

        if ($roomChoice !== null) {
            $roomBusy[$roomChoice][$day][$periodId] = true;
        }

        $subjectDay[$classKey][$item['subject_id']][$day] =
            ($subjectDay[$classKey][$item['subject_id']][$day] ?? 0) + 1;

        if ($dryRun) {
            return [
                'class_room_id' => $classRoomId,
                'section_id' => $sectionId,
                'day_of_week' => $day,
                'period_id' => $periodId,
                'subject_id' => $item['subject_id'],
                'teacher_user_id' => $item['teacher_user_id'],
                'room_id' => $roomChoice,
            ];
        }

        $slot = TimetableSlot::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'academic_year_id' => $academicYearId,
            'term_id' => $termId,
            'class_room_id' => $classRoomId,
            'section_id' => $sectionId,
            'period_id' => $periodId,
            'day_of_week' => $day,
            'subject_id' => $item['subject_id'],
            'teacher_user_id' => $item['teacher_user_id'],
            'room_id' => $roomChoice,
            'is_published' => false,
        ]);

        $slot->load(['period', 'subject', 'teacher', 'classRoom', 'section', 'room']);

        return $slot->toArray();
    }

    private function classKey(int $classRoomId, ?int $sectionId): string
    {
        return $classRoomId.':'.($sectionId ?? 0);
    }
}
