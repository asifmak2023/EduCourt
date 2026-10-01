<?php

namespace Database\Seeders\Uat;

use App\Enums\ComplaintPriority;
use App\Enums\ComplaintStatus;
use App\Enums\ConductCategory;
use App\Enums\ConductSeverity;
use App\Enums\ConductStatus;
use App\Enums\CounsellingStatus;
use App\Enums\WelfareRecordType;
use App\Models\ClubMembership;
use App\Models\Complaint;
use App\Models\ConductRecord;
use App\Models\CouncilMember;
use App\Models\CounsellingSession;
use App\Models\EventParticipant;
use App\Models\StudentClub;
use App\Models\StudentEvent;
use App\Models\WelfareRecord;

/**
 * Seeds student life and welfare: clubs and memberships, the student council,
 * student events and participants, conduct records, welfare notes, counselling
 * sessions and complaints.
 */
class UatStudentLifeSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 9000);

        $clubs = $this->clubs($ctx);
        $this->clubMemberships($ctx, $clubs);
        $this->council($ctx);
        $events = $this->events($ctx);
        $this->eventParticipants($ctx, $events);
        $this->conduct($ctx);
        $this->welfare($ctx);
        $this->counselling($ctx);
        $this->complaints($ctx);

        $this->command?->info('UAT:   '.$ctx->campusCode().' - student life, welfare, conduct, counselling, complaints');
    }

    /**
     * @return array<int, StudentClub>
     */
    protected function clubs(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Science & Robotics Club', 'CLUB-SCI', 'technology', 'Robotics, experiments and science fairs.'],
            ['Debate & Literature Society', 'CLUB-DEB', 'academic', 'Debates, declamation and literary events.'],
            ['Sports Club', 'CLUB-SPT', 'sports', 'Inter-house and inter-campus sports activities.'],
            ['Arts & Cultural Society', 'CLUB-ART', 'cultural', 'Music, drama, painting and cultural days.'],
            ['Community Service Society', 'CLUB-CSV', 'social', 'Charity drives and community outreach.'],
            ['IT & Coding Club', 'CLUB-IT', 'technology', 'Programming contests and app development.'],
        ];

        $clubs = [];
        foreach ($definitions as $i => [$name, $code, $category, $description]) {
            $clubs[] = $this->first(StudentClub::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'category' => $category,
                'description' => $description,
                'patron_user_id' => $ctx->teacher($i % max(1, count($ctx->teachers)))?->id,
                'is_active' => true,
            ]);
        }

        return $clubs;
    }

    /**
     * @param  array<int, StudentClub>  $clubs
     */
    protected function clubMemberships(UatCampusContext $ctx, array $clubs): void
    {
        if ($clubs === [] || $ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $roles = ['Member', 'Member', 'Member', 'Office Bearer', 'Secretary', 'President'];

        foreach ($ctx->students as $index => $student) {
            if ($index % 5 !== 0) {
                continue;
            }

            $club = $clubs[$index % count($clubs)];

            ClubMembership::firstOrCreate(
                ['student_club_id' => $club->id, 'student_id' => $student->id],
                $tenant + [
                    'role' => $roles[($index / 5) % count($roles)],
                    'status' => 'active',
                    'joined_on' => $this->day('2026-08-20', $index % 25),
                    'notes' => 'Enrolled through the co-curricular programme.',
                ]
            );
        }
    }

    protected function council(UatCampusContext $ctx): void
    {
        $positions = [
            'Head Boy', 'Head Girl', 'Deputy Head Boy', 'Deputy Head Girl',
            'General Secretary', 'Sports Captain', 'Cultural Secretary', 'Academic Coordinator',
        ];

        $tenant = $this->tenant($ctx->campus);

        foreach ($positions as $i => $position) {
            $student = $ctx->students[$i] ?? null;
            if ($student === null) {
                continue;
            }

            $this->first(CouncilMember::class, [
                'campus_id' => $ctx->campus->id,
                'position' => $position,
                'student_id' => $student->id,
            ], $tenant + [
                'term' => $ctx->year?->name ?? '2026-2027',
                'from_date' => $ctx->year?->starts_on,
                'to_date' => $ctx->year?->ends_on,
                'is_active' => true,
            ]);
        }
    }

    /**
     * @return array<int, StudentEvent>
     */
    protected function events(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Inter-House Sports Gala', 'sports', '2026-11-20', '2026-11-22', 'Main Ground', 150000, 'completed'],
            ['Annual Science Exhibition', 'competition', '2026-10-05', '2026-10-05', 'Science Block', 80000, 'completed'],
            ['Debate Championship', 'competition', '2026-09-25', '2026-09-25', 'Auditorium', 45000, 'completed'],
            ['Cultural Day', 'cultural', '2026-12-05', '2026-12-05', 'Auditorium', 120000, 'planned'],
            ['Spring Trip to Murree', 'trip', '2027-03-12', '2027-03-14', 'Murree', 350000, 'planned'],
            ['Career Counselling Seminar', 'seminar', '2027-02-10', '2027-02-10', 'Auditorium', 30000, 'planned'],
        ];

        $events = [];
        foreach ($definitions as [$title, $type, $starts, $ends, $venue, $budget, $status]) {
            $events[] = $this->first(StudentEvent::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'type' => $type,
                'description' => $title.' organised by the student affairs office.',
                'starts_on' => $starts,
                'ends_on' => $ends,
                'venue' => $venue,
                'budget' => $budget,
                'status' => $status,
                'organizer_user_id' => $ctx->role('student_affairs_officer')?->id ?? $ctx->campusAdmin?->id,
            ]);
        }

        return $events;
    }

    /**
     * @param  array<int, StudentEvent>  $events
     */
    protected function eventParticipants(UatCampusContext $ctx, array $events): void
    {
        if ($events === [] || $ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $statuses = ['registered', 'confirmed', 'attended'];

        foreach ($events as $e => $event) {
            $count = 12 + ($e % 6);
            for ($i = 0; $i < $count; $i++) {
                $student = $ctx->students[($e * 17 + $i) % count($ctx->students)];
                $status = $statuses[($e + $i) % count($statuses)];

                EventParticipant::firstOrCreate(
                    ['student_event_id' => $event->id, 'student_id' => $student->id],
                    $tenant + [
                        'role' => $i % 7 === 0 ? 'Team Captain' : 'Participant',
                        'status' => $status,
                        'position' => $status === 'attended' && $i % 5 === 0 ? $this->pick(['1st', '2nd', '3rd']) : null,
                        'remarks' => 'Registered via the student portal.',
                    ]
                );
            }
        }
    }

    protected function conduct(UatCampusContext $ctx): void
    {
        if ($ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            [ConductCategory::Discipline, ConductSeverity::Low, 'Late arrivals during assembly', ConductStatus::Resolved, 'Verbal warning issued.'],
            [ConductCategory::Uniform, ConductSeverity::Low, 'Incomplete uniform', ConductStatus::Resolved, 'Counselled and informed guardian.'],
            [ConductCategory::Academic, ConductSeverity::Medium, 'Repeated missed assignments', ConductStatus::Open, null],
            [ConductCategory::Participation, ConductSeverity::Low, 'Outstanding participation in debate', ConductStatus::Resolved, 'Appreciation note issued.'],
            [ConductCategory::Bullying, ConductSeverity::High, 'Verbal altercation with a classmate', ConductStatus::Resolved, 'Both parties mediated; parents informed.'],
            [ConductCategory::Achievement, ConductSeverity::Low, 'Won inter-house mathematics quiz', ConductStatus::Resolved, 'Awarded certificate.'],
            [ConductCategory::Discipline, ConductSeverity::Medium, 'Misbehaviour in laboratory', ConductStatus::Dismissed, 'No evidence found after inquiry.'],
            [ConductCategory::Other, ConductSeverity::Low, 'Damaged school property', ConductStatus::Resolved, 'Replacement cost recovered.'],
        ];

        foreach ($definitions as $i => [$category, $severity, $title, $status, $note]) {
            $student = $ctx->students[$i % count($ctx->students)];

            $this->first(ConductRecord::class, [
                'campus_id' => $ctx->campus->id,
                'student_id' => $student->id,
                'title' => $title,
            ], $tenant + [
                'academic_year_id' => $ctx->year?->id,
                'category' => $category,
                'severity' => $severity,
                'description' => $title.' observed and recorded by the class teacher.',
                'action_taken' => $note,
                'occurred_on' => $this->day('2026-09-05', $i * 6),
                'status' => $status,
                'reported_by' => $ctx->teacher($i)?->id,
                'resolved_by' => $status === ConductStatus::Open ? null : $ctx->role('principal')?->id,
                'resolved_at' => $status === ConductStatus::Open ? null : now(),
                'resolution_note' => $note,
                'created_by' => $ctx->role('student_affairs_officer')?->id ?? $ctx->campusAdmin?->id,
            ]);
        }
    }

    protected function welfare(UatCampusContext $ctx): void
    {
        if ($ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            [WelfareRecordType::Health, 'Routine health screening completed', 'open'],
            [WelfareRecordType::Medical, 'Allergy noted; medication kept with the dispensary', 'monitoring'],
            [WelfareRecordType::Welfare, 'Financial assistance referred to the welfare committee', 'monitoring'],
            [WelfareRecordType::Incident, 'Minor accident in the playground, first aid given', 'closed'],
            [WelfareRecordType::Health, 'Dental check-up camp participation', 'closed'],
            [WelfareRecordType::Welfare, 'Free uniform and books provided', 'closed'],
        ];

        foreach ($definitions as $i => [$type, $title, $status]) {
            $student = $ctx->students[($i * 3 + 1) % count($ctx->students)];

            $this->first(WelfareRecord::class, [
                'campus_id' => $ctx->campus->id,
                'student_id' => $student->id,
                'title' => $title,
            ], $tenant + [
                'type' => $type,
                'description' => $title.'. Details maintained by the student affairs office.',
                'recorded_on' => $this->day('2026-09-10', $i * 9),
                'status' => $status,
                'recorded_by' => $ctx->role('counsellor')?->id ?? $ctx->role('student_affairs_officer')?->id,
                'follow_up' => $status === 'closed' ? null : 'Review during the next welfare committee meeting.',
            ]);
        }
    }

    protected function counselling(UatCampusContext $ctx): void
    {
        if ($ctx->students === []) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['academic', CounsellingStatus::Completed, 'Discussed study plan and time management.'],
            ['career', CounsellingStatus::Completed, 'Guided on subject selection for higher studies.'],
            ['personal', CounsellingStatus::Scheduled, 'Peer relationship concerns; first session.'],
            ['behavioral', CounsellingStatus::Scheduled, 'Follow-up on classroom behaviour.'],
            ['academic', CounsellingStatus::Cancelled, 'Session cancelled on request of guardian.'],
            ['career', CounsellingStatus::Completed, 'Career pathways in computer science.'],
        ];

        foreach ($definitions as $i => [$type, $status, $summary]) {
            $student = $ctx->students[($i * 5 + 2) % count($ctx->students)];

            $this->first(CounsellingSession::class, [
                'campus_id' => $ctx->campus->id,
                'student_id' => $student->id,
                'session_date' => $this->day('2026-09-15', $i * 7),
            ], $tenant + [
                'counsellor_user_id' => $ctx->role('counsellor')?->id ?? $ctx->campusAdmin?->id,
                'type' => $type,
                'status' => $status,
                'summary' => $summary,
                'confidential_notes' => 'Confidential case note '.($i + 1).' - restricted to counselling staff.',
                'follow_up_on' => $status === CounsellingStatus::Completed ? $this->day('2026-09-15', $i * 7 + 21) : null,
            ]);
        }
    }

    protected function complaints(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['academic', ComplaintPriority::Medium, ComplaintStatus::Resolved, 'Teacher frequently absent', 'The subject teacher has been absent, affecting the syllabus.'],
            ['transport', ComplaintPriority::High, ComplaintStatus::InProgress, 'School bus arriving late', 'The morning bus has been late for the past week.'],
            ['canteen', ComplaintPriority::Low, ComplaintStatus::Resolved, 'Canteen hygiene concern', 'Requesting a hygiene check of the canteen area.'],
            ['fees', ComplaintPriority::Medium, ComplaintStatus::Open, 'Incorrect voucher amount', 'The fee voucher appears to include an extra charge.'],
            ['discipline', ComplaintPriority::High, ComplaintStatus::InProgress, 'Bullying complaint', 'Requesting action against reported bullying.'],
            ['hostel', ComplaintPriority::Medium, ComplaintStatus::Rejected, 'Room change request', 'Request for a different hostel room rejected, no vacancy.'],
            ['facilities', ComplaintPriority::Low, ComplaintStatus::Resolved, 'Broken classroom fan', 'Fan in classroom 12 is not working.'],
            ['academic', ComplaintPriority::High, ComplaintStatus::Open, 'Missing exam result', 'Result for one paper is not showing in the portal.'],
            ['transport', ComplaintPriority::Medium, ComplaintStatus::Resolved, 'Route stop change', 'Request to add a stop closer to home.'],
            ['other', ComplaintPriority::Low, ComplaintStatus::Resolved, 'Lost and found item', 'Requesting help locating a lost water bottle.'],
        ];

        foreach ($definitions as $i => [$category, $priority, $status, $subject, $description]) {
            $student = $ctx->students === [] ? null : $ctx->students[($i * 11) % count($ctx->students)];
            $resolved = in_array($status, [ComplaintStatus::Resolved, ComplaintStatus::Rejected], true);

            $this->first(Complaint::class, [
                'campus_id' => $ctx->campus->id,
                'reference_no' => 'CMP-'.$ctx->campusCode().'-'.sprintf('%04d', $i + 1),
            ], $tenant + [
                'student_id' => $student?->id,
                'raised_by' => $student?->user_id ?? $ctx->campusAdmin?->id,
                'against' => $this->pick(['Academic Office', 'Transport Department', 'Canteen', 'Hostel Warden', 'Accounts Office']),
                'category' => $category,
                'subject' => $subject,
                'description' => $description,
                'priority' => $priority,
                'status' => $status,
                'assigned_to' => in_array($status, [ComplaintStatus::Resolved, ComplaintStatus::InProgress], true)
                    ? ($ctx->role('student_affairs_officer')?->id ?? $ctx->campusAdmin?->id)
                    : null,
                'resolution' => $status === ComplaintStatus::Resolved ? 'Addressed and the complainant was informed.' : null,
                'resolved_at' => $resolved ? now() : null,
            ]);
        }
    }
}
