<?php

namespace App\Services\Attendance;

use App\Enums\AttendanceStatus;
use App\Enums\LeaveStatus;
use App\Models\LeaveRequest;
use App\Models\StaffAttendance;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveService
{
    public function approve(LeaveRequest $leave, User $actor, ?string $note = null): LeaveRequest
    {
        if ($leave->status !== LeaveStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending leave requests can be approved.'],
            ]);
        }

        return DB::transaction(function () use ($leave, $actor, $note) {
            $leave->forceFill([
                'status' => LeaveStatus::Approved,
                'decided_by' => $actor->id,
                'decided_on' => now()->toDateString(),
                'decision_note' => $note,
            ])->save();

            $this->writeLeaveAttendance($leave);

            return $leave->refresh();
        });
    }

    public function reject(LeaveRequest $leave, User $actor, ?string $note = null): LeaveRequest
    {
        if ($leave->status !== LeaveStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending leave requests can be rejected.'],
            ]);
        }

        $leave->forceFill([
            'status' => LeaveStatus::Rejected,
            'decided_by' => $actor->id,
            'decided_on' => now()->toDateString(),
            'decision_note' => $note,
        ])->save();

        return $leave->refresh();
    }

    /**
     * Mark the staff member on leave for every day in the approved range.
     */
    private function writeLeaveAttendance(LeaveRequest $leave): void
    {
        $cursor = Carbon::parse($leave->from_date);
        $end = Carbon::parse($leave->to_date);

        while ($cursor->lessThanOrEqualTo($end)) {
            StaffAttendance::updateOrCreate(
                [
                    'user_id' => $leave->user_id,
                    'attendance_date' => $cursor->toDateString(),
                ],
                [
                    'institution_id' => $leave->institution_id,
                    'campus_id' => $leave->campus_id,
                    'status' => AttendanceStatus::Leave,
                    'remarks' => 'Approved leave: '.$leave->leave_type->label(),
                    'marked_by' => $leave->decided_by,
                ]
            );

            $cursor->addDay();
        }
    }
}
