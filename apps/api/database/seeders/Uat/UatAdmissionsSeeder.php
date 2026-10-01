<?php

namespace Database\Seeders\Uat;

use App\Enums\AdmissionDocumentType;
use App\Enums\AdmissionStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Models\Admission;
use App\Models\AdmissionDocument;

/**
 * Seeds admission applications and their documents across all statuses.
 */
class UatAdmissionsSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 6000);

        $tenant = $this->tenant($ctx->campus);
        $classes = array_values($ctx->classes);
        $statuses = [
            AdmissionStatus::Enquiry,
            AdmissionStatus::Applied,
            AdmissionStatus::UnderReview,
            AdmissionStatus::Approved,
            AdmissionStatus::Rejected,
            AdmissionStatus::Enrolled,
        ];

        for ($i = 1; $i <= 18; $i++) {
            $gender = $i % 2 === 0 ? Gender::Male : Gender::Female;
            $name = $this->person((int) $ctx->campus->id * 2000 + $i, $gender->value);
            $status = $statuses[($i - 1) % count($statuses)];
            $class = $classes[($i - 1) % count($classes)];
            $applicationNo = 'APP-'.$ctx->campusCode().'-'.sprintf('%04d', $i);

            $admission = $this->first(Admission::class, [
                'campus_id' => $ctx->campus->id,
                'application_no' => $applicationNo,
            ], $tenant + [
                'first_name' => $name['first_name'],
                'last_name' => $name['last_name'],
                'gender' => $gender,
                'date_of_birth' => $this->day('2012-01-01', $i * 61),
                'class_room_id' => $class->id,
                'academic_year_id' => $ctx->year->id,
                'guardian_name' => 'Guardian '.$name['last_name'],
                'guardian_phone' => $this->phone($ctx->campus, 3000 + $i),
                'guardian_email' => 'applicant.parent'.$i.'.'.strtolower($ctx->campus->code).'@'.UatFoundationSeeder::EMAIL_DOMAIN,
                'guardian_relation' => GuardianRelation::Father,
                'previous_school' => $this->pick(['City Public School', 'The Educators', 'Beaconhouse', 'Government High School']),
                'address' => 'House '.$i.', '.$this->street($i).', '.$this->city($i),
                'city' => $this->city($i),
                'status' => $status,
                'applied_on' => $this->day('2026-03-01', $i * 3),
                'decided_on' => in_array($status, [AdmissionStatus::Approved, AdmissionStatus::Rejected, AdmissionStatus::Enrolled], true)
                    ? $this->day('2026-04-01', $i)
                    : null,
                'decided_by' => in_array($status, [AdmissionStatus::Approved, AdmissionStatus::Rejected, AdmissionStatus::Enrolled], true)
                    ? $ctx->role('admissions_officer')?->id
                    : null,
                'rejection_reason' => $status === AdmissionStatus::Rejected ? 'Incomplete documents submitted.' : null,
                'student_id' => $status === AdmissionStatus::Enrolled ? ($ctx->students[$i] ?? $ctx->students[0] ?? null)?->id : null,
                'notes' => 'UAT admission application.',
            ]);

            $this->documents($ctx, $admission, $i);
        }

        $this->command?->info('UAT:   '.$ctx->campusCode().' - 18 admission applications');
    }

    protected function documents(UatCampusContext $ctx, Admission $admission, int $index): void
    {
        $tenant = $this->tenant($ctx->campus);
        $docs = [
            [AdmissionDocumentType::BirthCertificate, 'Birth Certificate'],
            [AdmissionDocumentType::Photo, 'Passport Size Photo'],
            [AdmissionDocumentType::PreviousReport, 'Previous School Report'],
        ];

        foreach ($docs as $i => [$type, $title]) {
            AdmissionDocument::firstOrCreate(
                ['admission_id' => $admission->id, 'title' => $title],
                $tenant + [
                    'type' => $type,
                    'file_path' => 'uat/admissions/'.$admission->id.'-'.$i.'.pdf',
                    'original_name' => strtolower(str_replace(' ', '-', $title)).'.pdf',
                    'mime_type' => 'application/pdf',
                    'size' => 64000 + $i * 4096,
                    'uploaded_by' => $ctx->role('admissions_officer')?->id,
                ]
            );
        }
    }
}
