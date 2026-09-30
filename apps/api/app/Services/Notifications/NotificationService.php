<?php

namespace App\Services\Notifications;

use App\Enums\AttendanceStatus;
use App\Enums\NotificationStatus;
use App\Enums\NotificationType;
use App\Enums\ReminderChannel;
use App\Models\AppNotification;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Services\Notifications\Gateways\LogNotificationGateway;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Queues and dispatches guardian notifications (absence notices and general
 * messages) through a pluggable gateway.
 */
class NotificationService
{
    public function __construct(private readonly NotificationGateway $gateway) {}

    public static function makeGateway(): NotificationGateway
    {
        return match (config('reminders.gateway')) {
            default => new LogNotificationGateway,
        };
    }

    /**
     * Queue an absence notice for the student's primary guardian, if absent.
     */
    public function notifyAbsence(StudentAttendance $attendance, ?int $userId, bool $onlyNew = false): ?AppNotification
    {
        if ($attendance->status !== AttendanceStatus::Absent) {
            return null;
        }

        $existing = AppNotification::query()
            ->where('student_id', $attendance->student_id)
            ->where('type', NotificationType::Absence->value)
            ->whereDate('occurred_on', $attendance->attendance_date)
            ->where('status', '!=', NotificationStatus::Cancelled->value)
            ->first();

        if ($existing !== null) {
            return $onlyNew ? null : $existing;
        }

        $student = Student::query()->with('guardians')->find($attendance->student_id);

        if ($student === null) {
            return null;
        }

        [$guardian, $channel, $email, $phone] = $this->contactFor($student);

        $date = $attendance->attendance_date instanceof \DateTimeInterface
            ? $attendance->attendance_date->format('Y-m-d')
            : (string) $attendance->attendance_date;

        return $this->queue([
            'institution_id' => $attendance->institution_id,
            'campus_id' => $attendance->campus_id,
            'student_id' => $student->id,
            'guardian_id' => $guardian?->id,
            'type' => NotificationType::Absence,
            'channel' => $channel,
            'recipient_name' => $guardian?->name ?? $student->full_name,
            'recipient_email' => $email,
            'recipient_phone' => $phone,
            'title' => 'Absence notice',
            'body' => "Dear guardian, {$student->full_name} ({$student->admission_no}) was marked absent on {$date}. "
                .'Please contact the school if this is unexpected.',
            'occurred_on' => $date,
            'meta' => ['attendance_id' => $attendance->id],
            'created_by' => $userId,
        ]);
    }

    /**
     * Queue absence notices for every un-notified absence on a given date.
     *
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @return Collection<int, AppNotification>
     */
    public function queueAbsencesForDate(array $tenant, string $date, ?int $classRoomId, ?int $userId): Collection
    {
        $absences = StudentAttendance::query()
            ->where('campus_id', $tenant['campus_id'])
            ->whereDate('attendance_date', $date)
            ->where('status', AttendanceStatus::Absent->value)
            ->when($classRoomId !== null, fn ($q) => $q->where('class_room_id', $classRoomId))
            ->get();

        $queued = $absences
            ->map(fn (StudentAttendance $attendance) => $this->notifyAbsence($attendance, $userId, true))
            ->filter()
            ->values();

        return AppNotification::query()
            ->with(['student', 'guardian'])
            ->whereKey($queued->pluck('id')->all())
            ->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function queue(array $attributes): AppNotification
    {
        return AppNotification::create([
            'type' => NotificationType::General,
            'channel' => ReminderChannel::from((string) config('reminders.channel', 'email')),
            'status' => NotificationStatus::Pending,
            ...$attributes,
        ]);
    }

    public function send(AppNotification $notification): AppNotification
    {
        if ($notification->status === NotificationStatus::Cancelled) {
            return $notification;
        }

        $delivered = $this->gateway->send($notification);

        $notification->update([
            'status' => $delivered ? NotificationStatus::Sent : NotificationStatus::Failed,
            'sent_at' => $delivered ? now() : null,
            'failure_reason' => $delivered ? null : 'Gateway rejected the delivery.',
        ]);

        return $notification->refresh();
    }

    public function cancel(AppNotification $notification): AppNotification
    {
        if ($notification->status === NotificationStatus::Pending) {
            $notification->update(['status' => NotificationStatus::Cancelled]);
        }

        return $notification->refresh();
    }

    /**
     * @return array{0: ?Guardian, 1: ReminderChannel, 2: ?string, 3: ?string}
     */
    private function contactFor(Student $student): array
    {
        $guardians = $student->guardians
            ->sortByDesc(fn (Guardian $guardian) => (bool) $guardian->pivot->is_primary)
            ->values();

        foreach ($guardians as $guardian) {
            if ($guardian->email !== null) {
                return [$guardian, ReminderChannel::Email, $guardian->email, $guardian->phone];
            }

            if ($guardian->phone !== null) {
                return [$guardian, ReminderChannel::Sms, $guardian->email, $guardian->phone];
            }
        }

        if ($student->email !== null) {
            return [null, ReminderChannel::Email, $student->email, $student->phone];
        }

        if ($student->phone !== null) {
            return [null, ReminderChannel::Sms, $student->email, $student->phone];
        }

        return [null, ReminderChannel::InApp, null, null];
    }

    public function today(): Carbon
    {
        return Carbon::today();
    }
}
