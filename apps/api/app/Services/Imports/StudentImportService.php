<?php

namespace App\Services\Imports;

use App\Enums\EnrollmentStatus;
use App\Enums\StudentStatus;
use App\Models\AcademicYear;
use App\Models\ClassRoom;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Bulk student migration from a CSV file (an Excel workbook saved as CSV).
 *
 * Parsing, header normalisation and per-row validation happen up front so a
 * dry run can preview exactly what would be created. The same validated rows
 * are then persisted on commit, each in its own transaction so one bad row
 * never blocks the rest when "skip invalid rows" is enabled.
 */
class StudentImportService
{
    public const MAX_ROWS = 5000;

    /**
     * Canonical column => accepted header aliases (normalised, see key()).
     *
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'first_name' => ['first_name', 'firstname', 'given_name', 'first'],
        'last_name' => ['last_name', 'lastname', 'surname', 'family_name', 'last'],
        'gender' => ['gender', 'sex'],
        'admission_no' => ['admission_no', 'admission_number', 'adm_no'],
        'date_of_birth' => ['date_of_birth', 'dob', 'birth_date'],
        'blood_group' => ['blood_group', 'bloodgroup'],
        'nationality' => ['nationality'],
        'religion' => ['religion'],
        'category' => ['category'],
        'national_id' => ['national_id', 'cnic', 'id_number'],
        'email' => ['email', 'student_email'],
        'phone' => ['phone', 'student_phone', 'mobile'],
        'address' => ['address'],
        'city' => ['city'],
        'previous_school' => ['previous_school', 'previous_school_name'],
        'admission_date' => ['admission_date', 'joining_date'],
        'status' => ['status'],
        'guardian_name' => ['guardian_name', 'parent_name', 'father_name', 'parent'],
        'guardian_relationship' => ['guardian_relationship', 'relationship'],
        'guardian_email' => ['guardian_email', 'parent_email'],
        'guardian_phone' => ['guardian_phone', 'parent_phone', 'parent_mobile'],
        'guardian_is_primary' => ['guardian_is_primary', 'is_primary', 'primary_guardian'],
        'academic_year' => ['academic_year', 'year', 'session'],
        'class' => ['class', 'class_room', 'grade', 'class_name'],
        'section' => ['section'],
    ];

    private const REQUIRED_HEADERS = ['first_name', 'last_name', 'gender'];

    private const RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'];

    /**
     * Parse and validate a CSV file.
     *
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @return array{
     *     rows: int, valid: int, created: int, skipped: int,
     *     errors: list<array{line: int, message: string}>,
     *     preview: list<array<string, mixed>>
     * }
     *
     * @throws ValidationException
     */
    public function import(
        array $tenant,
        string $path,
        bool $dryRun = true,
        bool $skipInvalid = false,
        ?int $userId = null,
    ): array {
        $rows = $this->parse($path);

        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => ['The file is empty or could not be parsed.'],
            ]);
        }

        if (count($rows) > self::MAX_ROWS) {
            throw ValidationException::withMessages([
                'file' => ['The file has '.count($rows).' rows; the maximum per import is '.self::MAX_ROWS.'.'],
            ]);
        }

        $errors = [];
        $valid = [];
        $invalidRows = 0;
        $seenAdmissionNumbers = [];

        foreach ($rows as $row) {
            [$payload, $rowErrors] = $this->validateRow($row['data'], $row['line'], $tenant, $seenAdmissionNumbers);

            if ($rowErrors !== []) {
                $invalidRows++;
                foreach ($rowErrors as $message) {
                    $errors[] = ['line' => $row['line'], 'message' => $message];
                }

                continue;
            }

            if ($payload['admission_no'] !== null) {
                $seenAdmissionNumbers[$payload['admission_no']] = true;
            }

            $valid[] = ['line' => $row['line'], 'payload' => $payload];
        }

        $created = 0;
        $skipped = $invalidRows;

        if (! $dryRun) {
            if ($invalidRows > 0 && ! $skipInvalid) {
                throw ValidationException::withMessages([
                    'file' => ["{$invalidRows} row(s) failed validation. Fix them or enable \"skip invalid rows\"."],
                ]);
            }

            $created = $this->persist($tenant, $valid, $userId);
        }

        return [
            'rows' => count($rows),
            'valid' => count($valid),
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors,
            'preview' => array_slice(array_map(
                fn (array $item) => [
                    'line' => $item['line'],
                    'admission_no' => $item['payload']['admission_no'],
                    'first_name' => $item['payload']['profile']['first_name'],
                    'last_name' => $item['payload']['profile']['last_name'],
                    'gender' => $item['payload']['profile']['gender'],
                    'guardian' => $item['payload']['guardian']['name'] ?? null,
                    'class' => $item['payload']['enrollment']['class_name'] ?? null,
                    'section' => $item['payload']['enrollment']['section_name'] ?? null,
                ],
                $valid,
            ), 0, 25),
        ];
    }

    /**
     * @return list<array{line: int, data: array<string, string>}>
     */
    private function parse(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => ['The file could not be opened.']]);
        }

        try {
            $firstLine = (string) fgets($handle);
            $firstLine = $this->stripBom($firstLine);

            $delimiter = $this->detectDelimiter($firstLine);

            rewind($handle);
            $headerLine = fgets($handle);
            $headerLine = $this->stripBom((string) $headerLine);
            $headers = $this->mapHeaders(str_getcsv($headerLine, $delimiter));

            $missing = array_diff(self::REQUIRED_HEADERS, array_values($headers));

            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'file' => ['Missing required column(s): '.implode(', ', $missing).'.'],
                ]);
            }

            $rows = [];
            $line = 1;

            while (($record = fgetcsv($handle, 0, $delimiter)) !== false) {
                $line++;

                if ($record === [null] || $this->isBlankRow($record)) {
                    continue;
                }

                $data = [];
                foreach ($headers as $index => $field) {
                    $data[$field] = isset($record[$index]) ? trim((string) $record[$index]) : '';
                }

                $rows[] = ['line' => $line, 'data' => $data];
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  list<string|null>  $rawHeaders
     * @return array<int, string> canonical field keyed by column index
     */
    private function mapHeaders(array $rawHeaders): array
    {
        $lookup = [];
        foreach (self::HEADER_ALIASES as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                $lookup[$this->key($alias)] = $canonical;
            }
        }

        $headers = [];
        foreach ($rawHeaders as $index => $raw) {
            $key = $this->key((string) $raw);

            if (isset($lookup[$key])) {
                $headers[$index] = $lookup[$key];
            }
        }

        return $headers;
    }

    /**
     * @param  array<string, string>  $data
     * @param  array<string, bool>  $seenAdmissionNumbers
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private function validateRow(array $data, int $line, array $tenant, array $seenAdmissionNumbers): array
    {
        $errors = [];

        $firstName = $data['first_name'] ?? '';
        $lastName = $data['last_name'] ?? '';

        if ($firstName === '' || mb_strlen($firstName) > 100) {
            $errors[] = 'First name is required (max 100 characters).';
        }

        if ($lastName === '' || mb_strlen($lastName) > 100) {
            $errors[] = 'Last name is required (max 100 characters).';
        }

        $gender = $this->normaliseGender($data['gender'] ?? '');
        if ($gender === null) {
            $errors[] = 'Gender must be male, female or other.';
        }

        $email = $this->nullIfBlank($data['email'] ?? '');
        if ($email !== null && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors[] = "Student email \"{$email}\" is invalid.";
        }

        $dateOfBirth = $this->parseDate($data['date_of_birth'] ?? '');
        if ($dateOfBirth === false) {
            $errors[] = 'Date of birth is not a valid date.';
        }

        $admissionDate = $this->parseDate($data['admission_date'] ?? '');
        if ($admissionDate === false) {
            $errors[] = 'Admission date is not a valid date.';
        }

        $status = $this->normaliseStatus($data['status'] ?? '');
        if ($status === null) {
            $errors[] = 'Status is not a recognised student status.';
        }

        $admissionNo = $this->nullIfBlank($data['admission_no'] ?? '');
        if ($admissionNo !== null) {
            if (mb_strlen($admissionNo) > 32) {
                $errors[] = 'Admission number is too long (max 32 characters).';
            } elseif (isset($seenAdmissionNumbers[$admissionNo])) {
                $errors[] = "Admission number \"{$admissionNo}\" is duplicated in this file.";
            } elseif (Student::withTrashed()->where('campus_id', $tenant['campus_id'])->where('admission_no', $admissionNo)->exists()) {
                $errors[] = "Admission number \"{$admissionNo}\" already exists on this campus.";
            }
        }

        $guardian = $this->resolveGuardian($data, $errors);
        $enrollment = $this->resolveEnrollment($data, $tenant, $errors);

        if ($errors !== []) {
            return [[], $errors];
        }

        return [[
            'admission_no' => $admissionNo,
            'profile' => array_filter([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'gender' => $gender,
                'date_of_birth' => $dateOfBirth ?: null,
                'blood_group' => $this->nullIfBlank($data['blood_group'] ?? ''),
                'nationality' => $this->nullIfBlank($data['nationality'] ?? ''),
                'religion' => $this->nullIfBlank($data['religion'] ?? ''),
                'category' => $this->nullIfBlank($data['category'] ?? ''),
                'national_id' => $this->nullIfBlank($data['national_id'] ?? ''),
                'email' => $email,
                'phone' => $this->nullIfBlank($data['phone'] ?? ''),
                'address' => $this->nullIfBlank($data['address'] ?? ''),
                'city' => $this->nullIfBlank($data['city'] ?? ''),
                'previous_school' => $this->nullIfBlank($data['previous_school'] ?? ''),
                'admission_date' => $admissionDate ?: null,
                'status' => $status,
            ], fn ($value) => $value !== null),
            'guardian' => $guardian,
            'enrollment' => $enrollment,
        ], []];
    }

    /**
     * @param  array<string, string>  $data
     * @param  list<string>  $errors
     * @return array<string, mixed>|null
     */
    private function resolveGuardian(array $data, array &$errors): ?array
    {
        $name = $this->nullIfBlank($data['guardian_name'] ?? '');
        $email = $this->nullIfBlank($data['guardian_email'] ?? '');
        $phone = $this->nullIfBlank($data['guardian_phone'] ?? '');

        if ($name === null) {
            if ($email !== null || $phone !== null) {
                $errors[] = 'Guardian name is required when guardian email or phone is provided.';
            }

            return null;
        }

        if ($email !== null && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors[] = "Guardian email \"{$email}\" is invalid.";
        }

        $relationship = mb_strtolower(trim($data['guardian_relationship'] ?? ''));
        if ($relationship === '') {
            $relationship = 'guardian';
        }
        if (! in_array($relationship, self::RELATIONSHIPS, true)) {
            $errors[] = 'Guardian relationship must be father, mother, guardian or other.';
            $relationship = 'guardian';
        }

        return [
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'relationship' => $relationship,
            'is_primary' => $this->toBool($data['guardian_is_primary'] ?? ''),
        ];
    }

    /**
     * @param  array<string, string>  $data
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  list<string>  $errors
     * @return array<string, mixed>|null
     */
    private function resolveEnrollment(array $data, array $tenant, array &$errors): ?array
    {
        $className = $this->nullIfBlank($data['class'] ?? '');
        $yearName = $this->nullIfBlank($data['academic_year'] ?? '');
        $sectionName = $this->nullIfBlank($data['section'] ?? '');

        if ($className === null) {
            if ($yearName !== null || $sectionName !== null) {
                $errors[] = 'A class is required when academic year or section is provided.';
            }

            return null;
        }

        if ($yearName === null) {
            $errors[] = 'An academic year is required when a class is provided.';

            return null;
        }

        $year = AcademicYear::query()
            ->where('campus_id', $tenant['campus_id'])
            ->where(fn ($q) => $q->whereRaw('LOWER(name) = ?', [mb_strtolower($yearName)])
                ->orWhereRaw('LOWER(code) = ?', [mb_strtolower($yearName)]))
            ->first();

        if ($year === null) {
            $errors[] = "Academic year \"{$yearName}\" was not found on this campus.";

            return null;
        }

        $class = ClassRoom::query()
            ->where('campus_id', $tenant['campus_id'])
            ->where(fn ($q) => $q->whereRaw('LOWER(name) = ?', [mb_strtolower($className)])
                ->orWhereRaw('LOWER(code) = ?', [mb_strtolower($className)]))
            ->first();

        if ($class === null) {
            $errors[] = "Class \"{$className}\" was not found on this campus.";

            return null;
        }

        $section = null;
        if ($sectionName !== null) {
            $section = Section::query()
                ->where('class_room_id', $class->id)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($sectionName)])
                ->first();

            if ($section === null) {
                $errors[] = "Section \"{$sectionName}\" was not found in class \"{$className}\".";

                return null;
            }
        }

        return [
            'academic_year_id' => $year->id,
            'class_room_id' => $class->id,
            'section_id' => $section?->id,
            'class_name' => $class->name,
            'section_name' => $section?->name,
        ];
    }

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     * @param  list<array{line: int, payload: array<string, mixed>}>  $valid
     */
    private function persist(array $tenant, array $valid, ?int $userId): int
    {
        $created = 0;
        $sequence = $this->nextAdmissionSequence($tenant['campus_id']);

        foreach ($valid as $item) {
            $payload = $item['payload'];

            try {
                DB::transaction(function () use ($tenant, $payload, &$sequence) {
                    $admissionNo = $payload['admission_no'] ?? $this->nextAdmissionNumber($tenant['campus_id'], $sequence);

                    $student = Student::create([
                        ...$payload['profile'],
                        'institution_id' => $tenant['institution_id'],
                        'campus_id' => $tenant['campus_id'],
                        'admission_no' => $admissionNo,
                    ]);

                    if ($payload['guardian'] !== null) {
                        $guardian = Guardian::create([
                            'institution_id' => $tenant['institution_id'],
                            'campus_id' => $tenant['campus_id'],
                            'name' => $payload['guardian']['name'],
                            'email' => $payload['guardian']['email'],
                            'phone' => $payload['guardian']['phone'],
                        ]);

                        $student->guardians()->attach($guardian->id, [
                            'relationship' => $payload['guardian']['relationship'],
                            'is_primary' => $payload['guardian']['is_primary'],
                            'is_emergency_contact' => false,
                        ]);
                    }

                    if ($payload['enrollment'] !== null) {
                        StudentEnrollment::create([
                            'institution_id' => $tenant['institution_id'],
                            'campus_id' => $tenant['campus_id'],
                            'student_id' => $student->id,
                            'academic_year_id' => $payload['enrollment']['academic_year_id'],
                            'class_room_id' => $payload['enrollment']['class_room_id'],
                            'section_id' => $payload['enrollment']['section_id'],
                            'status' => EnrollmentStatus::Active->value,
                            'starts_on' => now()->toDateString(),
                        ]);
                    }
                });

                $created++;
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return $created;
    }

    private function nextAdmissionSequence(int $campusId): int
    {
        return Student::withTrashed()->where('campus_id', $campusId)->count() + 1;
    }

    private function nextAdmissionNumber(int $campusId, int &$sequence): string
    {
        do {
            $admissionNo = sprintf('ADM-%05d', $sequence);
            $sequence++;
        } while (Student::withTrashed()->where('campus_id', $campusId)->where('admission_no', $admissionNo)->exists());

        return $admissionNo;
    }

    private function normaliseGender(string $value): ?string
    {
        $value = mb_strtolower(trim($value));

        return match ($value) {
            'm', 'male', 'boy' => 'male',
            'f', 'female', 'girl' => 'female',
            'o', 'other' => 'other',
            default => null,
        };
    }

    private function normaliseStatus(string $value): ?string
    {
        $value = mb_strtolower(trim($value));

        if ($value === '') {
            return StudentStatus::Active->value;
        }

        foreach (StudentStatus::cases() as $case) {
            if ($case->value === $value) {
                return $case->value;
            }
        }

        return null;
    }

    /**
     * @return string|false|null null when blank, false when unparseable
     */
    private function parseDate(string $value): string|false|null
    {
        $value = trim($value);

        if ($value === '') {
            return null;
        }

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y', 'Y/m/d', 'm/d/Y'] as $format) {
            $parsed = \DateTimeImmutable::createFromFormat('!'.$format, $value);
            $errors = \DateTimeImmutable::getLastErrors();

            $hasWarnings = $errors !== false
                && ($errors['warning_count'] > 0 || $errors['error_count'] > 0);

            if ($parsed !== false && ! $hasWarnings) {
                return $parsed->format('Y-m-d');
            }
        }

        try {
            return CarbonImmutable::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return false;
        }
    }

    private function toBool(string $value): bool
    {
        return in_array(mb_strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
    }

    private function nullIfBlank(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * @param  list<string|null>  $record
     */
    private function isBlankRow(array $record): bool
    {
        foreach ($record as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }

    private function key(string $value): string
    {
        $value = mb_strtolower(trim($value));

        return (string) preg_replace('/[^a-z0-9]+/', '_', $value);
    }

    private function stripBom(string $line): string
    {
        return str_starts_with($line, "\xEF\xBB\xBF") ? substr($line, 3) : $line;
    }

    private function detectDelimiter(string $line): string
    {
        foreach ([',', ';', "\t"] as $candidate) {
            if (substr_count($line, $candidate) > 0) {
                return $candidate;
            }
        }

        return ',';
    }
}
