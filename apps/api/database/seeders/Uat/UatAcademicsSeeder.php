<?php

namespace Database\Seeders\Uat;

use App\Enums\AcademicEventType;
use App\Enums\CampusType;
use App\Enums\SubjectType;
use App\Models\AcademicEvent;
use App\Models\AcademicYear;
use App\Models\ClassBook;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\LessonPlan;
use App\Models\Period;
use App\Models\Room;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\SyllabusUnit;
use App\Models\TeachingAssignment;
use App\Models\Term;
use App\Models\TimetableSlot;

/**
 * Builds the academic backbone for a campus: academic year, terms, stages,
 * classes, sections, subjects, curriculum mapping, teaching assignments,
 * periods, rooms, timetable, syllabus, lesson plans and class books.
 */
class UatAcademicsSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 2000);

        $type = $ctx->campus->type;
        $profile = $this->profile($type instanceof CampusType ? $type->value : (string) $type);

        $this->academicYear($ctx, $profile);
        $this->stagesAndClasses($ctx, $profile);
        $this->subjects($ctx, $profile);
        $this->curriculum($ctx);
        $this->assignments($ctx);
        $this->periodsAndRooms($ctx);
        $this->timetable($ctx);
        $this->syllabus($ctx);
        $this->events($ctx);

        $this->command?->info(sprintf(
            'UAT:   %s - %d classes, %d subjects, %d timetable slots',
            $ctx->campusCode(),
            count($ctx->classes),
            count($ctx->subjects),
            TimetableSlot::query()->where('campus_id', $ctx->campus->id)->count()
        ));
    }

    /**
     * @return array{
     *     year_name: string, year_code: string, year_start: string, year_end: string,
     *     term_system: string, terms: array<int, array{0: string, 1: int, 2: string, 3: string}>,
     *     stages: array<int, array{0: string, 1: string, 2: int}>,
     *     classes: array<int, array{0: string, 1: string, 2: string, 3: int}>,
     *     subjects: array<int, array{0: string, 1: string, 2: string}>
     * }
     */
    protected function profile(string $type): array
    {
        $yearName = '2026-2027';
        $yearCode = 'AY-2026';

        if ($type === CampusType::School->value) {
            return [
                'year_name' => $yearName,
                'year_code' => $yearCode,
                'year_start' => '2026-04-01',
                'year_end' => '2027-03-31',
                'term_system' => 'terms',
                'terms' => [
                    ['Term 1', 1, '2026-04-01', '2026-08-31'],
                    ['Term 2', 2, '2026-09-01', '2026-12-31'],
                    ['Term 3', 3, '2027-01-01', '2027-03-31'],
                ],
                'stages' => [
                    ['Early Years', 'EY', 1],
                    ['Primary', 'PRI', 2],
                    ['Middle', 'MID', 3],
                ],
                'classes' => [
                    ['Playgroup', 'PG', 'EY', 1],
                    ['Nursery', 'NUR', 'EY', 2],
                    ['Kindergarten', 'KG', 'EY', 3],
                    ['Class 1', 'C1', 'PRI', 4],
                    ['Class 2', 'C2', 'PRI', 5],
                    ['Class 3', 'C3', 'PRI', 6],
                ],
                'subjects' => [
                    ['English', 'ENG', SubjectType::Core->value],
                    ['Urdu', 'URD', SubjectType::Core->value],
                    ['Mathematics', 'MATH', SubjectType::Core->value],
                    ['Science', 'SCI', SubjectType::Core->value],
                    ['Islamiat', 'ISL', SubjectType::Core->value],
                    ['Social Studies', 'SST', SubjectType::Core->value],
                    ['Computer Studies', 'COMP', SubjectType::Core->value],
                    ['Art & Craft', 'ART', SubjectType::Elective->value],
                ],
            ];
        }

        if ($type === CampusType::College->value) {
            return [
                'year_name' => $yearName,
                'year_code' => $yearCode,
                'year_start' => '2026-09-01',
                'year_end' => '2027-06-30',
                'term_system' => 'semesters',
                'terms' => [
                    ['Fall 2026', 1, '2026-09-01', '2027-01-31'],
                    ['Spring 2027', 2, '2027-02-01', '2027-06-30'],
                ],
                'stages' => [
                    ['Intermediate', 'INT', 1],
                    ['Bachelor', 'BACH', 2],
                ],
                'classes' => [
                    ['Pre-Engineering', 'PRE-ENG', 'INT', 1],
                    ['Pre-Medical', 'PRE-MED', 'INT', 2],
                    ['ICS', 'ICS', 'INT', 3],
                    ['Commerce', 'COM', 'INT', 4],
                ],
                'subjects' => [
                    ['English', 'ENG', SubjectType::Core->value],
                    ['Urdu', 'URD', SubjectType::Core->value],
                    ['Islamiat', 'ISL', SubjectType::Core->value],
                    ['Physics', 'PHY', SubjectType::Core->value],
                    ['Chemistry', 'CHE', SubjectType::Core->value],
                    ['Biology', 'BIO', SubjectType::Elective->value],
                    ['Mathematics', 'MATH', SubjectType::Core->value],
                    ['Computer Science', 'COMP', SubjectType::Core->value],
                ],
            ];
        }

        return [
            'year_name' => $yearName,
            'year_code' => $yearCode,
            'year_start' => '2026-09-01',
            'year_end' => '2027-06-30',
            'term_system' => 'semesters',
            'terms' => [
                ['Fall 2026', 1, '2026-09-01', '2027-01-31'],
                ['Spring 2027', 2, '2027-02-01', '2027-06-30'],
            ],
            'stages' => [
                ['Undergraduate', 'UG', 1],
                ['Graduate', 'GR', 2],
            ],
            'classes' => [
                ['BS Computer Science', 'BSCS', 'UG', 1],
                ['BS Software Engineering', 'BSSE', 'UG', 2],
                ['BBA', 'BBA', 'UG', 3],
                ['BS Electrical Engineering', 'BSEE', 'UG', 4],
            ],
            'subjects' => [
                ['Programming Fundamentals', 'CS101', SubjectType::Core->value],
                ['Data Structures', 'CS102', SubjectType::Core->value],
                ['Software Engineering', 'SE201', SubjectType::Core->value],
                ['Principles of Management', 'BA101', SubjectType::Core->value],
                ['Circuit Analysis', 'EE101', SubjectType::Core->value],
                ['Calculus', 'MATH101', SubjectType::Core->value],
                ['English Composition', 'ENG101', SubjectType::Core->value],
                ['Islamic Studies', 'ISL101', SubjectType::Core->value],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    protected function academicYear(UatCampusContext $ctx, array $profile): void
    {
        $tenant = $this->tenant($ctx->campus);

        $ctx->year = $this->first(AcademicYear::class, [
            'campus_id' => $ctx->campus->id,
            'name' => $profile['year_name'],
        ], $tenant + [
            'code' => $profile['year_code'],
            'starts_on' => $profile['year_start'],
            'ends_on' => $profile['year_end'],
            'status' => 'active',
            'is_current' => true,
        ]);

        $ctx->terms = [];
        foreach ($profile['terms'] as $i => [$name, $sequence, $from, $to]) {
            $ctx->terms[] = $this->first(Term::class, [
                'academic_year_id' => $ctx->year->id,
                'name' => $name,
            ], $tenant + [
                'sequence' => $sequence,
                'starts_on' => $from,
                'ends_on' => $to,
                'is_current' => $i === 0,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    protected function stagesAndClasses(UatCampusContext $ctx, array $profile): void
    {
        $tenant = $this->tenant($ctx->campus);

        $ctx->stages = [];
        foreach ($profile['stages'] as [$name, $code, $sequence]) {
            $ctx->stages[$code] = $this->first(Stage::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + ['name' => $name, 'sequence' => $sequence, 'is_active' => true]);
        }

        $ctx->classes = [];
        $ctx->sections = [];
        foreach ($profile['classes'] as [$name, $code, $stageCode, $sequence]) {
            $class = $this->first(ClassRoom::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'stage_id' => $ctx->stages[$stageCode]->id,
                'name' => $name,
                'sequence' => $sequence,
                'capacity' => 60,
                'in_charge_user_id' => $ctx->teacher($sequence - 1)?->id,
                'is_active' => true,
            ]);

            $ctx->classes[$code] = $class;
            $ctx->sections[$code] = [];

            foreach (['A', 'B', 'C'] as $sectionName) {
                $ctx->sections[$code][] = $this->first(Section::class, [
                    'class_room_id' => $class->id,
                    'name' => $sectionName,
                ], $tenant + [
                    'capacity' => 40,
                    'in_charge_user_id' => $ctx->teacher($sequence)?->id,
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $profile
     */
    protected function subjects(UatCampusContext $ctx, array $profile): void
    {
        $tenant = $this->tenant($ctx->campus);
        $ctx->subjects = [];

        foreach ($profile['subjects'] as $index => [$name, $code, $type]) {
            $ctx->subjects[$code] = $this->first(Subject::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'type' => $type,
                'credit_hours' => $type === SubjectType::Elective->value ? 2 : 3,
                'weekly_periods' => 5,
                'is_active' => true,
            ]);
        }
    }

    protected function curriculum(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        foreach ($ctx->classes as $class) {
            foreach ($ctx->subjects as $subject) {
                ClassSubject::firstOrCreate(
                    [
                        'academic_year_id' => $ctx->year->id,
                        'class_room_id' => $class->id,
                        'subject_id' => $subject->id,
                    ],
                    $tenant + [
                        'is_elective' => $subject->type === SubjectType::Elective,
                        'weekly_periods' => 5,
                        'is_active' => true,
                    ]
                );
            }
        }
    }

    protected function assignments(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $subjectList = array_values($ctx->subjects);
        $i = 0;

        foreach ($ctx->classes as $class) {
            foreach ($ctx->sectionsFor($class->code) as $section) {
                foreach ($subjectList as $subject) {
                    $teacher = $ctx->teacher($i % max(1, count($ctx->teachers)));
                    $i++;

                    TeachingAssignment::firstOrCreate(
                        [
                            'academic_year_id' => $ctx->year->id,
                            'teacher_user_id' => $teacher?->id,
                            'subject_id' => $subject->id,
                            'class_room_id' => $class->id,
                            'section_id' => $section->id,
                        ],
                        $tenant + ['weekly_periods' => 5, 'is_active' => true]
                    );
                }
            }
        }
    }

    protected function periodsAndRooms(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $periods = [
            ['Period 1', 1, '08:00:00', '08:45:00', false],
            ['Period 2', 2, '08:45:00', '09:30:00', false],
            ['Period 3', 3, '09:30:00', '10:15:00', false],
            ['Break', 4, '10:15:00', '10:45:00', true],
            ['Period 4', 5, '10:45:00', '11:30:00', false],
            ['Period 5', 6, '11:30:00', '12:15:00', false],
            ['Period 6', 7, '12:15:00', '13:00:00', false],
        ];

        foreach ($periods as [$name, $sequence, $start, $end, $isBreak]) {
            $this->first(Period::class, [
                'campus_id' => $ctx->campus->id,
                'sequence' => $sequence,
            ], $tenant + [
                'name' => $name,
                'starts_at' => $start,
                'ends_at' => $end,
                'is_break' => $isBreak,
                'is_active' => true,
            ]);
        }

        foreach (range(1, 10) as $n) {
            $this->first(Room::class, [
                'campus_id' => $ctx->campus->id,
                'code' => 'R-'.sprintf('%02d', $n),
            ], $tenant + [
                'name' => 'Room '.$n,
                'block' => $n <= 5 ? 'Block A' : 'Block B',
                'floor' => (string) (($n - 1) % 3),
                'type' => $n <= 8 ? 'classroom' : 'lab',
                'capacity' => 40,
                'is_active' => true,
            ]);
        }
    }

    protected function timetable(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $periods = Period::query()
            ->where('campus_id', $ctx->campus->id)
            ->where('is_break', false)
            ->orderBy('sequence')
            ->get();
        $rooms = Room::query()->where('campus_id', $ctx->campus->id)->orderBy('code')->get();
        $subjectList = array_values($ctx->subjects);

        $day = 1;
        foreach ($ctx->classes as $class) {
            foreach ($ctx->sectionsFor($class->code) as $sectionIndex => $section) {
                foreach (range(1, 5) as $dow) {
                    foreach ($periods as $pIndex => $period) {
                        $subject = $subjectList[($day + $pIndex + $sectionIndex) % count($subjectList)];
                        $teacher = $ctx->teacher(($day + $pIndex) % max(1, count($ctx->teachers)));
                        $room = $rooms[($day + $pIndex + $sectionIndex) % $rooms->count()];

                        TimetableSlot::firstOrCreate(
                            [
                                'class_room_id' => $class->id,
                                'section_id' => $section->id,
                                'period_id' => $period->id,
                                'day_of_week' => $dow,
                            ],
                            $tenant + [
                                'academic_year_id' => $ctx->year->id,
                                'term_id' => $ctx->terms[0]->id,
                                'subject_id' => $subject->id,
                                'teacher_user_id' => $teacher?->id,
                                'room_id' => $room->id,
                                'is_published' => true,
                            ]
                        );
                    }
                }
                $day++;
            }
        }
    }

    protected function syllabus(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $term = $ctx->terms[0];

        foreach ($ctx->classes as $class) {
            foreach ($ctx->subjects as $subject) {
                for ($unit = 1; $unit <= 4; $unit++) {
                    $syllabus = SyllabusUnit::firstOrCreate(
                        [
                            'academic_year_id' => $ctx->year->id,
                            'class_room_id' => $class->id,
                            'subject_id' => $subject->id,
                            'sequence' => $unit,
                        ],
                        $tenant + [
                            'term_id' => $term->id,
                            'title' => $subject->name.' - Unit '.$unit,
                            'description' => 'Unit '.$unit.' of '.$subject->name.' covering core concepts and practice.',
                            'estimated_periods' => 12,
                        ]
                    );

                    if ($unit === 1) {
                        LessonPlan::firstOrCreate(
                            [
                                'academic_year_id' => $ctx->year->id,
                                'class_room_id' => $class->id,
                                'subject_id' => $subject->id,
                                'title' => 'Introduction to '.$subject->name,
                            ],
                            $tenant + [
                                'term_id' => $term->id,
                                'syllabus_unit_id' => $syllabus->id,
                                'created_by' => $ctx->teacher(0)?->id,
                                'objectives' => 'Introduce the fundamentals of '.$subject->name.'.',
                                'content' => 'Overview, key terminology and foundational exercises.',
                                'resources' => 'Textbook, whiteboard, projector.',
                                'activities' => 'Lecture, group discussion, quiz.',
                                'assessment' => 'Class quiz and homework.',
                                'planned_from' => $ctx->year->starts_on,
                                'planned_to' => $this->day($ctx->year->starts_on->toDateString(), 14),
                                'status' => 'approved',
                                'approved_by' => $ctx->role('principal')?->id,
                                'approved_at' => now(),
                            ]
                        );
                    }
                }

                ClassBook::firstOrCreate(
                    [
                        'academic_year_id' => $ctx->year->id,
                        'class_room_id' => $class->id,
                        'subject_id' => $subject->id,
                        'title' => $subject->name.' Textbook',
                    ],
                    $tenant + [
                        'author' => 'Board of Studies',
                        'publisher' => 'National Book Foundation',
                        'isbn' => '978-'.sprintf('%010d', abs(crc32($ctx->campusCode().$class->code.$subject->code))),
                        'edition' => '2026',
                        'price' => 850,
                        'is_required' => true,
                    ]
                );
            }
        }
    }

    protected function events(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $events = [
            ['Independence Day Assembly', AcademicEventType::Event, '2026-08-14', null],
            ['First Term Examinations', AcademicEventType::Exam, '2026-12-10', '2026-12-20'],
            ['Winter Break', AcademicEventType::Holiday, '2026-12-25', '2027-01-05'],
            ['Annual Sports Day', AcademicEventType::Event, '2026-11-20', null],
            ['Parent Teacher Meeting', AcademicEventType::Meeting, '2026-10-15', null],
        ];

        foreach ($events as [$title, $type, $starts, $ends]) {
            $this->first(AcademicEvent::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
                'starts_on' => $starts,
            ], $tenant + [
                'academic_year_id' => $ctx->year->id,
                'term_id' => $ctx->terms[0]->id,
                'type' => $type,
                'ends_on' => $ends,
                'is_all_day' => true,
                'created_by' => $ctx->campusAdmin?->id,
            ]);
        }
    }
}
