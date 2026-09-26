<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceStatus;
use App\Models\ClassRoom;
use App\Models\StaffAttendance;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<int, array{student_id: int, status: string, remarks?: string|null}>  $records
     * @param  array{academic_year_id?: int|null, class_room_id?: int|null, section_id?: int|null}  $context
     * @return Collection<int, StudentAttendance>
     */
    public function markStudents(array $tenant, User $user, string $date, array $records, array $context = []): Collection
    {
        $studentIds = collect($records)->pluck('student_id')->unique()->all();

        $known = Student::query()
            ->whereIn('id', $studentIds)
            ->pluck('id')
            ->all();

        $unknown = array_diff($studentIds, $known);

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'records' => ['Unknown students for this campus: '.implode(', ', $unknown)],
            ]);
        }

        return DB::transaction(function () use ($tenant, $user, $date, $records, $context) {
            $marked = collect($records)->map(function (array $record) use ($tenant, $user, $date, $context) {
                return StudentAttendance::updateOrCreate(
                    ['student_id' => $record['student_id'], 'attendance_date' => $date],
                    $tenant + [
                        'academic_year_id' => $context['academic_year_id'] ?? null,
                        'class_room_id' => $context['class_room_id'] ?? null,
                        'section_id' => $context['section_id'] ?? null,
                        'status' => AttendanceStatus::from($record['status']),
                        'remarks' => $record['remarks'] ?? null,
                        'marked_by' => $user->id,
                    ]
                );
            });

            $marked->each(fn (StudentAttendance $attendance) => $this->notifications->notifyAbsence($attendance, $user->id));

            return new Collection($marked->all());
        });
    }

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<int, array{user_id: int, status: string, check_in?: string|null, check_out?: string|null, remarks?: string|null}>  $records
     * @return Collection<int, StaffAttendance>
     */
    public function markStaff(array $tenant, User $user, string $date, array $records): Collection
    {
        return DB::transaction(function () use ($tenant, $user, $date, $records) {
            $marked = collect($records)->map(function (array $record) use ($tenant, $user, $date) {
                return StaffAttendance::updateOrCreate(
                    ['user_id' => $record['user_id'], 'attendance_date' => $date],
                    $tenant + [
                        'status' => AttendanceStatus::from($record['status']),
                        'check_in' => $record['check_in'] ?? null,
                        'check_out' => $record['check_out'] ?? null,
                        'remarks' => $record['remarks'] ?? null,
                        'marked_by' => $user->id,
                    ]
                );
            });

            return new Collection($marked->all());
        });
    }

    /**
     * Per-class attendance summary for a date range.
     *
     * @return array{from: string, to: string, classes: array<int, array<string, mixed>>, totals: array<string, int>}
     */
    public function classSummary(int $campusId, string $from, string $to, ?int $classRoomId = null, ?int $sectionId = null): array
    {
        $aggregate = StudentAttendance::query()
            ->where('campus_id', $campusId)
            ->whereBetween('attendance_date', [$from, $to])
            ->when($classRoomId, fn ($q) => $q->where('class_room_id', $classRoomId))
            ->when($sectionId, fn ($q) => $q->where('section_id', $sectionId))
            ->select('class_room_id')
            ->selectRaw('count(distinct student_id) as total')
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as present")
            ->selectRaw("sum(case when status = 'leave' then 1 else 0 end) as `leave`")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->groupBy('class_room_id')
            ->get()
            ->keyBy('class_room_id');

        $genders = DB::table('student_attendances')
            ->join('students', 'students.id', '=', 'student_attendances.student_id')
            ->where('student_attendances.campus_id', $campusId)
            ->whereBetween('student_attendances.attendance_date', [$from, $to])
            ->when($classRoomId, fn ($q) => $q->where('student_attendances.class_room_id', $classRoomId))
            ->when($sectionId, fn ($q) => $q->where('student_attendances.section_id', $sectionId))
            ->groupBy('student_attendances.class_room_id', 'students.gender')
            ->selectRaw('student_attendances.class_room_id as class_room_id, students.gender as gender, count(distinct students.id) as total')
            ->get()
            ->groupBy('class_room_id');

        $classNames = ClassRoom::query()
            ->whereIn('id', $aggregate->keys())
            ->pluck('name', 'id');

        $classes = $aggregate->map(function ($row) use ($genders, $classNames) {
            $genderRows = $genders->get($row->class_room_id, collect());

            $byGender = fn (string $gender) => (int) $genderRows
                ->firstWhere('gender', $gender)?->total;

            return [
                'class_room_id' => $row->class_room_id,
                'class_room' => $classNames[$row->class_room_id] ?? null,
                'total' => (int) $row->total,
                'boys' => $byGender('male'),
                'girls' => $byGender('female'),
                'present' => (int) $row->present,
                'leave' => (int) $row->{'leave'},
                'absent' => (int) $row->absent,
            ];
        })->values()->all();

        return [
            'from' => $from,
            'to' => $to,
            'classes' => $classes,
            'totals' => [
                'total' => array_sum(array_column($classes, 'total')),
                'boys' => array_sum(array_column($classes, 'boys')),
                'girls' => array_sum(array_column($classes, 'girls')),
                'present' => array_sum(array_column($classes, 'present')),
                'leave' => array_sum(array_column($classes, 'leave')),
                'absent' => array_sum(array_column($classes, 'absent')),
            ],
        ];
    }

    /**
     * Per-day count of a single student's attendance over a range.
     *
     * @return array<string, mixed>
     */
    public function studentSummary(int $studentId, string $from, string $to): array
    {
        $rows = StudentAttendance::query()
            ->where('student_id', $studentId)
            ->whereBetween('attendance_date', [$from, $to])
            ->get();

        $count = fn (AttendanceStatus ...$statuses) => $rows->filter(
            fn (StudentAttendance $row) => in_array($row->status, $statuses, true)
        )->count();

        return [
            'student_id' => $studentId,
            'from' => $from,
            'to' => $to,
            'present' => $count(AttendanceStatus::Present),
            'late' => $count(AttendanceStatus::Late),
            'leave' => $count(AttendanceStatus::Leave),
            'absent' => $count(AttendanceStatus::Absent),
            'excused' => $count(AttendanceStatus::Excused),
            'marked' => $rows->count(),
        ];
    }

    /**
     * Inclusive calendar-day count between two dates.
     */
    public function inclusiveDays(string $from, string $to): float
    {
        return (float) (Carbon::parse($from)->startOfDay()->diffInDays(Carbon::parse($to)->startOfDay()) + 1);
    }
}
