<?php

namespace App\Services\Reminders;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\VoucherStatus;
use App\Models\Campus;
use App\Models\FeeReminder;
use App\Models\FeeVoucher;
use App\Models\Guardian;
use App\Models\Student;
use App\Services\Reminders\Gateways\LogReminderGateway;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds, persists and dispatches fee reminders for defaulting students.
 */
class ReminderService
{
    public function __construct(private readonly ReminderGateway $gateway) {}

    public function gateway(): ReminderGateway
    {
        return $this->gateway;
    }

    /**
     * Resolve the configured gateway, falling back to the log driver.
     */
    public static function makeGateway(): ReminderGateway
    {
        return match (config('reminders.gateway')) {
            'log' => new LogReminderGateway,
            default => new LogReminderGateway,
        };
    }

    /**
     * Build the defaulters eligible for a reminder, keyed by student.
     *
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<string, mixed>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    public function candidates(array $tenant, array $filters): Collection
    {
        $asOf = isset($filters['as_of']) && $filters['as_of'] !== null
            ? Carbon::parse($filters['as_of'])
            : Carbon::today();

        $overdueOnly = (bool) ($filters['overdue_only'] ?? true);
        $minDaysOverdue = (int) ($filters['min_days_overdue'] ?? 0);
        $minBalance = (float) ($filters['min_balance'] ?? 0);
        $academicYearId = $filters['academic_year_id'] ?? null;
        $classRoomId = $filters['class_room_id'] ?? null;

        $vouchers = FeeVoucher::query()
            ->with(['student.guardians'])
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->when($classRoomId !== null, fn ($q) => $q->whereHas('student.enrollments', fn ($e) => $e
                ->where('class_room_id', $classRoomId)
                ->when($academicYearId !== null, fn ($inner) => $inner->where('academic_year_id', $academicYearId))))
            ->whereDate('due_date', '<=', $asOf->toDateString())
            ->orderBy('due_date')
            ->get();

        $grouped = [];

        foreach ($vouchers as $voucher) {
            $student = $voucher->student;

            if ($student === null) {
                continue;
            }

            $balance = round((float) $voucher->amount - (float) $voucher->paid_amount, 2);

            if ($balance <= 0 || $balance < $minBalance) {
                continue;
            }

            $daysOverdue = $voucher->due_date === null
                ? 0
                : max((int) $voucher->due_date->startOfDay()->diffInDays($asOf->copy()->startOfDay(), false), 0);

            if ($overdueOnly && $daysOverdue < max($minDaysOverdue, 1)) {
                continue;
            }

            if (! $overdueOnly && $daysOverdue < $minDaysOverdue) {
                continue;
            }

            if (! isset($grouped[$student->id])) {
                $grouped[$student->id] = [
                    'student' => $student,
                    'outstanding' => 0.0,
                    'oldest_due_date' => null,
                    'days_overdue' => 0,
                    'vouchers' => 0,
                ];
            }

            $grouped[$student->id]['outstanding'] += $balance;
            $grouped[$student->id]['vouchers']++;

            if ($daysOverdue > $grouped[$student->id]['days_overdue']) {
                $grouped[$student->id]['days_overdue'] = $daysOverdue;
            }

            $dueDate = $voucher->due_date?->toDateString();

            if ($dueDate !== null && ($grouped[$student->id]['oldest_due_date'] === null || $dueDate < $grouped[$student->id]['oldest_due_date'])) {
                $grouped[$student->id]['oldest_due_date'] = $dueDate;
            }
        }

        return collect($grouped);
    }

    /**
     * Persist pending reminders for every eligible defaulter.
     *
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  array<string, mixed>  $filters
     * @return array{created: EloquentCollection<int, FeeReminder>, skipped: int}
     */
    public function generate(array $tenant, array $filters, ?int $userId): array
    {
        $channel = ReminderChannel::tryFrom((string) ($filters['channel'] ?? config('reminders.channel', 'email')))
            ?? ReminderChannel::Email;
        $force = (bool) ($filters['force'] ?? false);
        $academicYearId = $filters['academic_year_id'] ?? null;
        $asOf = isset($filters['as_of']) && $filters['as_of'] !== null
            ? Carbon::parse($filters['as_of'])
            : Carbon::today();

        $campus = Campus::query()->find($tenant['campus_id']);
        $campusName = $campus?->name ?? 'Campus';

        $created = new EloquentCollection;
        $skipped = 0;

        foreach ($this->candidates($tenant, $filters) as $candidate) {
            /** @var Student $student */
            $student = $candidate['student'];

            [$guardian, $email, $phone] = $this->contactFor($student, $channel);

            if ($channel === ReminderChannel::Sms && $phone === null) {
                $skipped++;

                continue;
            }

            if ($channel !== ReminderChannel::Sms && $email === null) {
                $skipped++;

                continue;
            }

            if (! $force && $this->recentlyReminded($tenant['campus_id'], $student->id, $academicYearId)) {
                $skipped++;

                continue;
            }

            $created->push(FeeReminder::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'student_id' => $student->id,
                'academic_year_id' => $academicYearId,
                'guardian_id' => $guardian?->id,
                'channel' => $channel,
                'recipient_name' => $guardian?->name ?? $student->full_name,
                'recipient_email' => $email,
                'recipient_phone' => $phone,
                'outstanding' => $candidate['outstanding'],
                'bucket' => $this->bucketFor($candidate['days_overdue']),
                'oldest_due_date' => $candidate['oldest_due_date'],
                'days_overdue' => $candidate['days_overdue'],
                'message' => $this->renderMessage($student, $candidate, $campusName),
                'status' => ReminderStatus::Pending,
                'created_by' => $userId,
            ]));
        }

        return ['created' => $created, 'skipped' => $skipped];
    }

    public function send(FeeReminder $reminder): FeeReminder
    {
        if ($reminder->status === ReminderStatus::Cancelled) {
            return $reminder;
        }

        $delivered = $this->gateway->send($reminder);

        $reminder->update([
            'status' => $delivered ? ReminderStatus::Sent : ReminderStatus::Failed,
            'sent_at' => $delivered ? now() : null,
            'failure_reason' => $delivered ? null : 'Gateway rejected the delivery.',
        ]);

        return $reminder->refresh();
    }

    public function cancel(FeeReminder $reminder): FeeReminder
    {
        if ($reminder->status === ReminderStatus::Pending) {
            $reminder->update(['status' => ReminderStatus::Cancelled]);
        }

        return $reminder->refresh();
    }

    /**
     * @return array{0: ?Guardian, 1: ?string, 2: ?string}
     */
    private function contactFor(Student $student, ReminderChannel $channel): array
    {
        $guardians = $student->guardians
            ->sortByDesc(fn (Guardian $guardian) => (bool) $guardian->pivot->is_primary)
            ->values();

        foreach ($guardians as $guardian) {
            $email = $guardian->email;
            $phone = $guardian->phone;

            if ($channel === ReminderChannel::Sms && $phone !== null) {
                return [$guardian, $email, $phone];
            }

            if ($channel !== ReminderChannel::Sms && $email !== null) {
                return [$guardian, $email, $phone];
            }
        }

        return [null, $student->email, $student->phone];
    }

    private function recentlyReminded(int $campusId, int $studentId, mixed $academicYearId): bool
    {
        return FeeReminder::query()
            ->where('campus_id', $campusId)
            ->where('student_id', $studentId)
            ->where('status', '!=', ReminderStatus::Cancelled->value)
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->whereDate('created_at', Carbon::today()->toDateString())
            ->exists();
    }

    /**
     * @param  array<string, mixed>  $candidate
     */
    private function renderMessage(Student $student, array $candidate, string $campusName): string
    {
        $template = (string) config('reminders.message_template');

        return strtr($template, [
            '{student}' => $student->full_name,
            '{admission_no}' => (string) $student->admission_no,
            '{outstanding}' => $this->money((float) $candidate['outstanding']),
            '{oldest_due_date}' => (string) ($candidate['oldest_due_date'] ?? '-'),
            '{days_overdue}' => (string) $candidate['days_overdue'],
            '{campus}' => $campusName,
        ]);
    }

    private function bucketFor(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => 'days_1_30',
            $daysOverdue <= 60 => 'days_31_60',
            $daysOverdue <= 90 => 'days_61_90',
            default => 'days_over_90',
        };
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }
}
