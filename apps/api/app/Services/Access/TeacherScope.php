<?php

namespace App\Services\Access;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\StudentEnrollment;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Narrows staff-module queries to the classes/sections a teacher is assigned
 * to. Campus/institution global scopes still apply underneath.
 *
 * Only applies when the user holds the `teacher` role and no campus-broad staff
 * role; a broader role wins, so those accounts keep campus-wide visibility.
 */
class TeacherScope
{
    /** @var array<int, Collection<int, TeachingAssignment>> */
    private array $assignmentCache = [];

    /** @var array<int, array<int, int>> */
    private array $studentCache = [];

    public function isTeacherScoped(User $user): bool
    {
        if (! $user->hasRole(RoleName::Teacher->value)) {
            return false;
        }

        foreach (RoleName::cases() as $role) {
            if (in_array($role, [RoleName::Teacher, RoleName::Student, RoleName::ParentGuardian], true)) {
                continue;
            }

            if ($user->hasRole($role->value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Active teaching assignments for the user, restricted to the current
     * academic year when one is flagged for the active campus.
     *
     * @return Collection<int, TeachingAssignment>
     */
    public function assignments(User $user): Collection
    {
        $key = (int) $user->getKey();

        if (isset($this->assignmentCache[$key])) {
            return $this->assignmentCache[$key];
        }

        $query = TeachingAssignment::query()
            ->where('teacher_user_id', $user->id)
            ->where('is_active', true);

        $currentYearId = AcademicYear::query()->where('is_current', true)->value('id');
        if ($currentYearId !== null) {
            $query->where('academic_year_id', $currentYearId);
        }

        return $this->assignmentCache[$key] = $query->get();
    }

    /**
     * @return array<int, int>
     */
    public function classRoomIds(User $user): array
    {
        return $this->assignments($user)
            ->pluck('class_room_id')
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return array<int, int>
     */
    public function sectionIds(User $user): array
    {
        return $this->assignments($user)
            ->pluck('section_id')
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Students actively enrolled in any assigned class. When an assignment is
     * section-specific the enrollment must match that section; an assignment
     * with no section covers the whole class.
     *
     * @return array<int, int>
     */
    public function studentIds(User $user): array
    {
        $key = (int) $user->getKey();

        if (isset($this->studentCache[$key])) {
            return $this->studentCache[$key];
        }

        $byClass = $this->assignments($user)
            ->filter(fn (TeachingAssignment $assignment) => $assignment->class_room_id !== null)
            ->groupBy('class_room_id');

        if ($byClass->isEmpty()) {
            return $this->studentCache[$key] = [];
        }

        $query = StudentEnrollment::query()
            ->where('status', EnrollmentStatus::Active->value)
            ->where(function (Builder $outer) use ($byClass) {
                foreach ($byClass as $classRoomId => $rows) {
                    $wholeClass = $rows->contains(fn (TeachingAssignment $row) => $row->section_id === null);
                    $sections = $rows->pluck('section_id')->filter()->unique()->values();

                    $outer->orWhere(function (Builder $inner) use ($classRoomId, $wholeClass, $sections) {
                        $inner->where('class_room_id', $classRoomId);

                        if (! $wholeClass && $sections->isNotEmpty()) {
                            $inner->whereIn('section_id', $sections);
                        }
                    });
                }
            });

        return $this->studentCache[$key] = $query
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Apply the matching id constraint to a query. A no-op when the user is not
     * teacher-scoped; when scoped an empty allowed set yields no rows.
     */
    public function applyTo(Builder $query, User $user, string $column): Builder
    {
        if (! $this->isTeacherScoped($user)) {
            return $query;
        }

        $ids = match ($column) {
            'student_id' => $this->studentIds($user),
            'class_room_id' => $this->classRoomIds($user),
            'section_id' => $this->sectionIds($user),
            default => [],
        };

        return $query->whereIn($column, $ids);
    }

    public function allowsStudent(User $user, int $studentId): bool
    {
        if (! $this->isTeacherScoped($user)) {
            return true;
        }

        return in_array($studentId, $this->studentIds($user), true);
    }

    public function allowsClassRoom(User $user, ?int $classRoomId): bool
    {
        if (! $this->isTeacherScoped($user)) {
            return true;
        }

        return $classRoomId !== null && in_array($classRoomId, $this->classRoomIds($user), true);
    }
}
