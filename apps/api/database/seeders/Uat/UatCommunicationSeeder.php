<?php

namespace Database\Seeders\Uat;

use App\Enums\CircularAudience;
use App\Enums\CircularStatus;
use App\Enums\NotificationStatus;
use App\Enums\NotificationType;
use App\Enums\PtmBookingStatus;
use App\Enums\PtmEventStatus;
use App\Enums\ReminderChannel;
use App\Models\AppNotification;
use App\Models\Circular;
use App\Models\PtmBooking;
use App\Models\PtmEvent;
use App\Models\PtmSlot;
use App\Models\VisitorLog;

/**
 * Seeds campus communications: circulars, parent-teacher meeting events,
 * slots and bookings, notification history and the visitor register.
 */
class UatCommunicationSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 11000);

        $this->circulars($ctx);
        $event = $this->ptmEvent($ctx);
        $slots = $this->ptmSlots($ctx, $event);
        $this->ptmBookings($ctx, $slots);
        $this->notifications($ctx);
        $this->visitorLogs($ctx);

        $this->command?->info('UAT:   '.$ctx->campusCode().' - circulars, PTM, notifications, visitor logs');
    }

    protected function circulars(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $classes = array_values($ctx->classes);

        $definitions = [
            ['Independence Day Celebrations', CircularAudience::All, CircularStatus::Published, '2026-08-10', null],
            ['First Term Examination Schedule', CircularAudience::Students, CircularStatus::Published, '2026-11-25', null],
            ['Parent Teacher Meeting', CircularAudience::Parents, CircularStatus::Published, '2026-10-08', null],
            ['Winter Vacations Notice', CircularAudience::All, CircularStatus::Published, '2026-12-20', '2027-01-10'],
            ['Staff Development Workshop', CircularAudience::Staff, CircularStatus::Published, '2026-09-30', null],
            ['Annual Sports Day', CircularAudience::All, CircularStatus::Published, '2026-11-10', null],
            ['Summer Uniform Reminder', CircularAudience::ClassWise, CircularStatus::Draft, null, null],
            ['Last Year Fee Structure', CircularAudience::Parents, CircularStatus::Archived, '2025-12-01', '2026-01-31'],
            ['Library Book Return Reminder', CircularAudience::Students, CircularStatus::Published, '2026-09-18', null],
            ['Blood Donation Drive', CircularAudience::All, CircularStatus::Published, '2026-10-01', null],
        ];

        foreach ($definitions as $i => [$title, $audience, $status, $publishedOn, $expiresOn]) {
            $class = $audience === CircularAudience::ClassWise && $classes !== [] ? $classes[$i % count($classes)] : null;

            $this->first(Circular::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'body' => "Dear all,\n\n".$title." - please read the details carefully and comply with the instructions.\n\nRegistrar's Office",
                'audience' => $audience,
                'class_room_id' => $class?->id,
                'section_id' => null,
                'status' => $status,
                'published_at' => $publishedOn !== null ? $publishedOn.' 09:00:00' : null,
                'expires_on' => $expiresOn,
                'attachment_path' => $i % 3 === 0 ? 'uat/circulars/circular-'.$i.'.pdf' : null,
                'created_by' => $ctx->campusAdmin?->id,
            ]);
        }
    }

    protected function ptmEvent(UatCampusContext $ctx): PtmEvent
    {
        return $this->first(PtmEvent::class, [
            'campus_id' => $ctx->campus->id,
            'title' => 'Parent Teacher Meeting - Term 1',
        ], $this->tenant($ctx->campus) + [
            'description' => 'Term-wise parent teacher meeting to discuss student progress.',
            'event_date' => '2026-10-15',
            'venue' => 'Main Campus Auditorium',
            'status' => PtmEventStatus::Scheduled,
            'created_by' => $ctx->campusAdmin?->id,
        ]);
    }

    /**
     * @return array<int, PtmSlot>
     */
    protected function ptmSlots(UatCampusContext $ctx, PtmEvent $event): array
    {
        $tenant = $this->tenant($ctx->campus);
        $slots = [];
        $teachers = $ctx->teachers;

        if ($teachers === []) {
            return $slots;
        }

        foreach ($teachers as $t => $teacher) {
            for ($s = 0; $s < 3; $s++) {
                $hour = 9 + $s;
                $slots[] = $this->first(PtmSlot::class, [
                    'ptm_event_id' => $event->id,
                    'teacher_user_id' => $teacher->id,
                    'start_time' => sprintf('%02d:00:00', $hour),
                ], $tenant + [
                    'end_time' => sprintf('%02d:30:00', $hour),
                    'capacity' => 10,
                    'booked' => 0,
                    'room' => 'Room '.($t + 1),
                ]);
            }
        }

        return $slots;
    }

    /**
     * @param  array<int, PtmSlot>  $slots
     */
    protected function ptmBookings(UatCampusContext $ctx, array $slots): void
    {
        if ($slots === [] || $ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $statuses = [PtmBookingStatus::Booked, PtmBookingStatus::Attended, PtmBookingStatus::NoShow, PtmBookingStatus::Cancelled];

        foreach ($slots as $s => $slot) {
            $bookings = 3 + ($s % 4);
            for ($b = 0; $b < $bookings; $b++) {
                $student = $ctx->students[($s * 7 + $b) % count($ctx->students)];
                $guardian = $ctx->guardians[($s * 3 + $b) % max(1, count($ctx->guardians))] ?? null;
                $status = $statuses[($s + $b) % count($statuses)];

                PtmBooking::firstOrCreate(
                    ['ptm_slot_id' => $slot->id, 'student_id' => $student->id],
                    $tenant + [
                        'guardian_name' => $guardian?->name ?? 'Guardian of '.$student->first_name,
                        'guardian_phone' => $guardian?->phone ?? $this->phone($ctx->campus, $s * 10 + $b),
                        'notes' => $status === PtmBookingStatus::Cancelled ? 'Guardian requested rescheduling.' : null,
                        'status' => $status,
                    ]
                );
            }

            $slot->forceFill(['booked' => $bookings])->save();
        }
    }

    protected function notifications(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $students = $ctx->students;

        if ($students === []) {
            return;
        }

        $templates = [
            [NotificationType::Absence, ReminderChannel::Sms, NotificationStatus::Sent, 'Absence Alert', 'Your child was marked absent today.'],
            [NotificationType::FeeReminder, ReminderChannel::Email, NotificationStatus::Sent, 'Fee Payment Reminder', 'Kindly clear the outstanding fee before the due date.'],
            [NotificationType::General, ReminderChannel::InApp, NotificationStatus::Pending, 'PTM Announcement', 'The parent teacher meeting is scheduled for 15 October.'],
            [NotificationType::General, ReminderChannel::Email, NotificationStatus::Failed, 'Holiday Notice', 'The campus will remain closed for winter break.'],
            [NotificationType::Absence, ReminderChannel::Email, NotificationStatus::Sent, 'Late Arrival Notice', 'Your child arrived late to school today.'],
        ];

        foreach ($students as $index => $student) {
            if ($index % 8 !== 0) {
                continue;
            }

            [$type, $channel, $status, $title, $body] = $templates[($index / 8) % count($templates)];
            $guardian = $ctx->guardians[$index % max(1, count($ctx->guardians))] ?? null;

            AppNotification::firstOrCreate(
                [
                    'campus_id' => $ctx->campus->id,
                    'student_id' => $student->id,
                    'title' => $title,
                    'occurred_on' => $this->day('2026-09-20', $index % 10),
                ],
                $tenant + [
                    'guardian_id' => $guardian?->id,
                    'type' => $type,
                    'channel' => $channel,
                    'recipient_name' => $guardian?->name ?? 'Guardian',
                    'recipient_email' => $guardian?->email ?? $student->email,
                    'recipient_phone' => $guardian?->phone ?? $student->phone,
                    'body' => $body,
                    'status' => $status,
                    'sent_at' => $status === NotificationStatus::Sent ? now() : null,
                    'failure_reason' => $status === NotificationStatus::Failed ? 'SMTP timeout while sending.' : null,
                    'meta' => ['student' => $student->admission_no, 'source' => 'uat-seeder'],
                    'created_by' => $ctx->campusAdmin?->id,
                ]
            );
        }
    }

    protected function visitorLogs(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $purposes = ['Fee payment', 'Met the principal', 'Vendor delivery', 'Parent enquiry', 'Maintenance work', 'Interview'];

        for ($i = 1; $i <= 10; $i++) {
            $name = $this->person((int) $ctx->campus->id * 3000 + $i, $i % 2 === 0 ? 'female' : 'male');
            $inTime = $this->day('2026-09-25', $i) . ' 09:' . sprintf('%02d', ($i * 4) % 60) . ':00';
            $outTime = $this->day('2026-09-25', $i) . ' 10:' . sprintf('%02d', ($i * 6) % 60) . ':00';

            $this->first(VisitorLog::class, [
                'campus_id' => $ctx->campus->id,
                'name' => $name['first_name'].' '.$name['last_name'],
                'in_time' => $inTime,
            ], $tenant + [
                'phone' => $this->phone($ctx->campus, 7000 + $i),
                'id_type' => $this->pick(['cnic', 'cnic', 'passport', 'employee_card']),
                'id_number' => $this->cnic(9000 + $i),
                'purpose' => $purposes[$i % count($purposes)],
                'person_to_meet' => $ctx->role('campus_admin')?->name ?? $ctx->campusAdmin?->name ?? 'Campus Administrator',
                'badge_no' => 'V-'.sprintf('%03d', $i),
                'out_time' => $outTime,
                'notes' => 'Visitor record maintained at the main gate.',
                'created_by' => $ctx->campusAdmin?->id,
            ]);
        }
    }
}
