<?php

namespace Database\Seeders\Uat;

use App\Enums\AttendanceSource;
use App\Enums\AttendanceStatus;
use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Enums\SubstituteStatus;
use App\Models\AttendanceSyncBatch;
use App\Models\LeaveRequest;
use App\Models\StaffAttendance;
use App\Models\StudentAttendance;
use App\Models\SubstituteAssignment;
use App\Models\TimetableSlot;

/**
 * Seeds daily student and staff attendance, leave requests, substitute
 * assignments and offline attendance sync batches.
 */
class UatAttendanceSeeder extends UatSeederBase
{
    protected const BASE_DATE = '2026-09-21';

    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 5000);

        $this->studentAttendance($ctx);
        $this->staffAttendance($ctx);
        $this->leaveRequests($ctx);
        $this->substitutes($ctx);
        $this->syncBatch($ctx);

        $this->command?->info(sprintf(
            'UAT:   %s - attendance for %d students x 5 days',
            $ctx->campusCode(),
            count($ctx->students)
        ));
    }

    protected function studentAttendance(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        foreach ($ctx->students as $index => $student) {
            $enrollment = $ctx->enrollments[$student->id] ?? null;
            if ($enrollment === null) {
                continue;
            }

            for ($d = 0; $d < 5; $d++) {
                $date = $this->day(self::BASE_DATE, $d);
                $roll = ($index + $d) % 20;
                $status = match (true) {
                    $roll === 0 => AttendanceStatus::Absent,
                    $roll === 1 => AttendanceStatus::Late,
                    $roll === 2 => AttendanceStatus::Leave,
                    default => AttendanceStatus::Present,
                };

                $online = ($index + $d) % 4 !== 0;

                StudentAttendance::firstOrCreate(
                    ['student_id' => $student->id, 'attendance_date' => $date],
                    $tenant + [
                        'academic_year_id' => $ctx->year->id,
                        'class_room_id' => $enrollment->class_room_id,
                        'section_id' => $enrollment->section_id,
                        'status' => $status,
                        'marked_by' => $ctx->teacher($index % max(1, count($ctx->teachers)))?->id,
                        'source' => $online ? AttendanceSource::Online : AttendanceSource::Offline,
                        'device_id' => $online ? null : 'DEV-'.$ctx->campusCode().'-01',
                        'captured_at' => now(),
                        'synced_at' => $online ? null : now(),
                    ]
                );
            }
        }
    }

    protected function staffAttendance(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $i = 0;
        foreach ($ctx->staffByUser as $staff) {
            $i++;
            for ($d = 0; $d < 5; $d++) {
                $date = $this->day(self::BASE_DATE, $d);
                $status = ($i + $d) % 15 === 0 ? AttendanceStatus::Leave : AttendanceStatus::Present;

                StaffAttendance::updateOrCreate(
                    ['user_id' => $staff->user_id, 'attendance_date' => $date],
                    $tenant + [
                        'status' => $status,
                        'check_in' => $status === AttendanceStatus::Present ? '07:55:00' : null,
                        'check_out' => $status === AttendanceStatus::Present ? '14:05:00' : null,
                        'marked_by' => $ctx->campusAdmin?->id,
                    ]
                );
            }
        }
    }

    protected function leaveRequests(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $i = 0;

        foreach ($ctx->staffByUser as $staff) {
            $i++;
            if ($i % 4 !== 0) {
                continue;
            }

            LeaveRequest::firstOrCreate(
                ['user_id' => $staff->user_id, 'from_date' => $this->day('2026-10-01', $i)],
                $tenant + [
                    'leave_type' => $i % 8 === 0 ? LeaveType::Sick : LeaveType::Casual,
                    'to_date' => $this->day('2026-10-01', $i + 1),
                    'days' => 2,
                    'reason' => 'Personal reasons requiring leave.',
                    'status' => $i % 12 === 0 ? LeaveStatus::Pending : LeaveStatus::Approved,
                    'decided_by' => $i % 12 === 0 ? null : $ctx->role('principal')?->id,
                    'decided_on' => $i % 12 === 0 ? null : $this->day('2026-09-28', $i),
                    'decision_note' => $i % 12 === 0 ? null : 'Approved.',
                ]
            );
        }
    }

    protected function substitutes(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $slots = TimetableSlot::query()
            ->where('campus_id', $ctx->campus->id)
            ->orderBy('id')
            ->limit(6)
            ->get();

        foreach ($slots as $i => $slot) {
            SubstituteAssignment::firstOrCreate(
                ['timetable_slot_id' => $slot->id, 'date' => $this->day(self::BASE_DATE, $i % 5)],
                $tenant + [
                    'substitute_user_id' => ($i % 2 === 0 ? $ctx->campusAdmin : $ctx->teacher($i))?->id,
                    'status' => SubstituteStatus::Scheduled,
                    'reason' => 'Original teacher unavailable.',
                    'created_by' => $ctx->campusAdmin?->id,
                ]
            );
        }
    }

    protected function syncBatch(UatCampusContext $ctx): void
    {
        AttendanceSyncBatch::firstOrCreate(
            ['client_batch_uuid' => 'uat-'.$ctx->campusCode().'-001'],
            $this->tenant($ctx->campus) + [
                'user_id' => $ctx->campusAdmin?->id,
                'device_id' => 'DEV-'.$ctx->campusCode().'-01',
                'total_records' => count($ctx->students),
                'applied_count' => count($ctx->students),
                'duplicate_count' => 0,
                'conflict_count' => 0,
                'synced_at' => now(),
            ]
        );
    }
}
