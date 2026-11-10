<?php

namespace App\Services\WhatsApp;

use App\Enums\MessagingMemberType;
use App\Enums\MessagingSegmentType;
use App\Enums\NotificationType;
use App\Models\AppNotification;
use App\Models\Campus;
use App\Models\Guardian;
use App\Models\MessagingAudience;
use App\Models\MessagingAudienceMember;
use App\Models\MessagingAudienceSegment;
use App\Models\MessagingBroadcast;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Resolves a messaging audience (group or broadcast list) to individual
 * recipients and fans a single message out through the existing WhatsApp
 * delivery engine.
 *
 * Meta has no native groups, so every recipient is an individual message and is
 * still subject to consent, quota and template rules per the delivery engine.
 */
class BroadcastService
{
    public function __construct(private readonly WhatsAppDeliveryService $delivery) {}

    public static function make(): self
    {
        return new self(WhatsAppDeliveryService::make());
    }

    /**
     * Resolve the deduplicated recipient phone numbers for an audience.
     *
     * @return array<int, array{name: string, phone: string}>
     */
    public function recipients(MessagingAudience $audience): array
    {
        $collected = [];

        foreach ($audience->members as $member) {
            $resolved = $this->resolveMember($member);

            if ($resolved !== null) {
                $collected[$resolved['phone']] = $resolved;
            }
        }

        foreach ($audience->segments as $segment) {
            foreach ($this->resolveSegment($audience, $segment) as $resolved) {
                $collected[$resolved['phone']] = $resolved;
            }
        }

        return array_values($collected);
    }

    /**
     * Send a broadcast to every resolved recipient. Returns a tally.
     *
     * @return array{total: int, sent: int, failed: int}
     */
    public function send(MessagingBroadcast $broadcast, MessagingAudience $audience, ?int $createdBy = null): array
    {
        $recipients = $this->recipients($audience);
        $institutionId = (int) $audience->institution_id;
        $campusId = $audience->campus_id !== null ? (int) $audience->campus_id : null;

        $fallbackCampusId = $campusId ?? $this->defaultCampusId($institutionId);

        if ($fallbackCampusId === null) {
            $broadcast->forceFill([
                'recipients_total' => count($recipients),
                'recipients_sent' => 0,
                'recipients_failed' => count($recipients),
                'status' => 'failed',
            ])->save();

            return ['total' => count($recipients), 'sent' => 0, 'failed' => count($recipients)];
        }

        $sent = 0;
        $failed = 0;

        foreach ($recipients as $recipient) {
            $notification = AppNotification::create([
                'institution_id' => $institutionId,
                'campus_id' => $fallbackCampusId,
                'type' => NotificationType::Broadcast,
                'channel' => 'whatsapp',
                'recipient_name' => $recipient['name'],
                'recipient_phone' => $recipient['phone'],
                'title' => $broadcast->title,
                'body' => $broadcast->body,
                'status' => 'pending',
                'created_by' => $createdBy,
                'meta' => ['broadcast_id' => $broadcast->id, 'audience_id' => $audience->id],
            ]);

            if ($this->delivery->sendNotification($notification)) {
                $sent++;
            } else {
                $failed++;
            }
        }

        $broadcast->forceFill([
            'recipients_total' => count($recipients),
            'recipients_sent' => $sent,
            'recipients_failed' => $failed,
            'status' => $failed === 0 && $sent > 0 ? 'sent' : ($sent > 0 ? 'partial' : 'failed'),
        ])->save();

        Log::info('WhatsApp broadcast dispatched.', [
            'broadcast_id' => $broadcast->id,
            'audience_id' => $audience->id,
            'total' => count($recipients),
            'sent' => $sent,
            'failed' => $failed,
        ]);

        return ['total' => count($recipients), 'sent' => $sent, 'failed' => $failed];
    }

    /**
     * @return array{name: string, phone: string}|null
     */
    private function resolveMember(MessagingAudienceMember $member): ?array
    {
        if ($member->member_type === MessagingMemberType::Phone) {
            $phone = $this->normalise($member->phone ?? '');

            return $phone === null
                ? null
                : ['name' => $member->display_name ?? $phone, 'phone' => $phone];
        }

        if ($member->member_type === MessagingMemberType::Guardian && $member->member_id !== null) {
            $guardian = Guardian::query()->find($member->member_id);
            $phone = $this->normalise((string) ($guardian?->phone ?? $guardian?->alternate_phone ?? ''));

            return $phone === null ? null : ['name' => (string) $guardian?->name, 'phone' => $phone];
        }

        if ($member->member_type === MessagingMemberType::Student && $member->member_id !== null) {
            $student = Student::query()->with('guardians')->find($member->member_id);
            $guardian = $student?->guardians->firstWhere('pivot.is_primary', true) ?? $student?->guardians->first();
            $phone = $this->normalise((string) ($guardian?->phone ?? ''));

            return $phone === null ? null : ['name' => (string) ($student?->full_name ?? $member->display_name), 'phone' => $phone];
        }

        if ($member->member_type === MessagingMemberType::Staff && $member->member_id !== null) {
            $user = User::query()->find($member->member_id);
            $phone = $this->normalise((string) ($user?->phone ?? ''));

            return $phone === null ? null : ['name' => (string) $user?->name, 'phone' => $phone];
        }

        return null;
    }

    /**
     * @return array<int, array{name: string, phone: string}>
     */
    private function resolveSegment(MessagingAudience $audience, MessagingAudienceSegment $segment): array
    {
        return match ($segment->segment_type) {
            MessagingSegmentType::Section => $this->guardianRecipientsForStudents(
                $this->studentsInSection($audience, (int) $segment->segment_ref)
            ),
            MessagingSegmentType::ClassRoom => $this->guardianRecipientsForStudents(
                $this->studentsInClass($audience, (int) $segment->segment_ref)
            ),
            MessagingSegmentType::Role => $this->staffRecipients((string) $segment->segment_value, $audience),
            MessagingSegmentType::Campus => $this->guardianRecipientsForCampus($audience),
        };
    }

    /**
     * @return Collection<int, Student>
     */
    private function studentsInSection(MessagingAudience $audience, int $sectionId): Collection
    {
        return Student::query()
            ->whereIn('id', StudentEnrollment::query()
                ->where('section_id', $sectionId)
                ->when($audience->campus_id !== null, fn ($q) => $q->where('campus_id', $audience->campus_id))
                ->pluck('student_id'))
            ->with('guardians')
            ->get();
    }

    /**
     * @return Collection<int, Student>
     */
    private function studentsInClass(MessagingAudience $audience, int $classRoomId): Collection
    {
        return Student::query()
            ->whereIn('id', StudentEnrollment::query()
                ->where('class_room_id', $classRoomId)
                ->when($audience->campus_id !== null, fn ($q) => $q->where('campus_id', $audience->campus_id))
                ->pluck('student_id'))
            ->with('guardians')
            ->get();
    }

    /**
     * @param  Collection<int, Student>  $students
     * @return array<int, array{name: string, phone: string}>
     */
    private function guardianRecipientsForStudents(Collection $students): array
    {
        $recipients = [];

        foreach ($students as $student) {
            $guardian = $student->guardians->firstWhere('pivot.is_primary', true) ?? $student->guardians->first();
            $phone = $this->normalise((string) ($guardian?->phone ?? $guardian?->alternate_phone ?? ''));

            if ($phone !== null) {
                $recipients[$phone] = ['name' => (string) $guardian?->name, 'phone' => $phone];
            }
        }

        return array_values($recipients);
    }

    /**
     * @return array<int, array{name: string, phone: string}>
     */
    private function guardianRecipientsForCampus(MessagingAudience $audience): array
    {
        $query = Guardian::query()
            ->when($audience->campus_id !== null, fn ($q) => $q->where('campus_id', $audience->campus_id))
            ->whereNotNull('phone');

        $recipients = [];

        foreach ($query->get() as $guardian) {
            $phone = $this->normalise((string) $guardian->phone);

            if ($phone !== null) {
                $recipients[$phone] = ['name' => (string) $guardian->name, 'phone' => $phone];
            }
        }

        return array_values($recipients);
    }

    /**
     * @return array<int, array{name: string, phone: string}>
     */
    private function staffRecipients(string $role, MessagingAudience $audience): array
    {
        $users = User::query()
            ->when($audience->campus_id !== null, fn ($q) => $q->where('campus_id', $audience->campus_id))
            ->when($role !== '', fn ($q) => $q->role($role))
            ->whereNotNull('phone')
            ->get();

        $recipients = [];

        foreach ($users as $user) {
            $phone = $this->normalise((string) $user->phone);

            if ($phone !== null) {
                $recipients[$phone] = ['name' => (string) $user->name, 'phone' => $phone];
            }
        }

        return array_values($recipients);
    }

    private function defaultCampusId(int $institutionId): int
    {
        return (int) Campus::query()
            ->where('institution_id', $institutionId)
            ->orderBy('id')
            ->value('id');
    }

    private function normalise(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            $digits = '92'.substr($digits, 1);
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15 ? $digits : null;
    }
}
