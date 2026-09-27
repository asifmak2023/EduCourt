<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceSource;
use App\Enums\AttendanceStatus;
use App\Models\AttendanceSyncBatch;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reconciles attendance captured offline on the mobile app. Records carry a
 * client UUID (idempotency) and a capture timestamp used to resolve conflicts
 * with records already on the server.
 */
class AttendanceSyncService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<int, array<string, mixed>>  $records
     */
    public function sync(array $tenant, User $user, ?string $deviceId, array $records, ?string $batchUuid = null): AttendanceSyncBatch
    {
        if ($batchUuid !== null) {
            $existing = AttendanceSyncBatch::query()
                ->where('client_batch_uuid', $batchUuid)
                ->first();

            if ($existing !== null) {
                return $existing;
            }
        }

        $studentIds = collect($records)->pluck('student_id')->unique()->values();
        $known = Student::query()->whereIn('id', $studentIds)->pluck('id')->all();
        $unknown = $studentIds->diff($known)->all();

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'records' => ['Unknown students for this campus: '.implode(', ', $unknown)],
            ]);
        }

        return DB::transaction(function () use ($tenant, $user, $deviceId, $records, $batchUuid) {
            $batch = AttendanceSyncBatch::create($tenant + [
                'user_id' => $user->id,
                'client_batch_uuid' => $batchUuid,
                'device_id' => $deviceId,
                'total_records' => count($records),
                'synced_at' => now(),
            ]);

            $applied = 0;
            $duplicates = 0;
            $conflicts = 0;

            foreach ($records as $record) {
                $capturedAt = Carbon::parse($record['captured_at']);
                $date = Carbon::parse($record['attendance_date'])->toDateString();

                if (StudentAttendance::query()->where('client_uuid', $record['client_uuid'])->exists()) {
                    $duplicates++;

                    continue;
                }

                $existing = StudentAttendance::query()
                    ->where('student_id', $record['student_id'])
                    ->whereDate('attendance_date', $date)
                    ->first();

                if ($existing !== null) {
                    $serverStamp = $existing->captured_at ?? $existing->updated_at ?? $existing->created_at;

                    if ($serverStamp !== null && $serverStamp->gt($capturedAt)) {
                        $conflicts++;

                        continue;
                    }
                }

                $attendance = StudentAttendance::updateOrCreate(
                    ['student_id' => $record['student_id'], 'attendance_date' => $date],
                    $tenant + [
                        'academic_year_id' => $record['academic_year_id'] ?? null,
                        'class_room_id' => $record['class_room_id'] ?? null,
                        'section_id' => $record['section_id'] ?? null,
                        'status' => AttendanceStatus::from($record['status']),
                        'remarks' => $record['remarks'] ?? null,
                        'marked_by' => $user->id,
                        'client_uuid' => $record['client_uuid'],
                        'source' => AttendanceSource::Offline,
                        'device_id' => $deviceId,
                        'captured_at' => $capturedAt,
                        'synced_at' => now(),
                    ]
                );

                $this->notifications->notifyAbsence($attendance, $user->id);
                $applied++;
            }

            $batch->forceFill([
                'applied_count' => $applied,
                'duplicate_count' => $duplicates,
                'conflict_count' => $conflicts,
            ])->save();

            return $batch->refresh();
        });
    }
}
