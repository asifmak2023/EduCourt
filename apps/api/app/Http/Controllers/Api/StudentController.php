<?php

namespace App\Http\Controllers\Api;

use App\Enums\EnrollmentStatus;
use App\Enums\StudentStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Services\Access\TeacherScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TeacherScope $teacherScope) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $students = Student::query()
            ->with(['guardians', 'enrollments.classRoom', 'enrollments.section'])
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('admission_no', 'like', "%{$search}%")
                    ->orWhere('national_id', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('gender'), fn ($q) => $q->where('gender', $request->string('gender')->toString()))
            ->when(
                $request->filled('class_room_id') || $request->filled('section_id') || $request->filled('academic_year_id'),
                fn ($q) => $q->whereHas('enrollments', function ($inner) use ($request) {
                    $inner->when($request->filled('academic_year_id'), fn ($e) => $e->where('academic_year_id', $request->integer('academic_year_id')))
                        ->when($request->filled('class_room_id'), fn ($e) => $e->where('class_room_id', $request->integer('class_room_id')))
                        ->when($request->filled('section_id'), fn ($e) => $e->where('section_id', $request->integer('section_id')));
                })
            )
            ->orderBy('first_name')
            ->orderBy('last_name');

        $this->teacherScope->applyTo($students, $request->user(), 'student_id');

        $students = $students->paginate($request->integer('per_page', 25));

        return StudentResource::collection($students);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $student = DB::transaction(function () use ($data, $tenant) {
            $student = Student::create([
                ...$this->profileAttributes($data),
                ...$tenant,
                'admission_no' => $data['admission_no'] ?? $this->generateAdmissionNo($tenant['campus_id']),
                'status' => $data['status'] ?? StudentStatus::Active->value,
            ]);

            if (! empty($data['guardians'])) {
                $this->syncGuardians($student, $data['guardians']);
            }

            if (! empty($data['enrollment'])) {
                $this->createEnrollment($student, $data['enrollment'], $tenant);
            }

            return $student;
        });

        return (new StudentResource($student->load(['guardians', 'enrollments.classRoom', 'enrollments.section'])))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, Student $student): StudentResource
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $student->id), 403, 'This student is outside your assigned classes.');

        return new StudentResource($student->load([
            'guardians', 'enrollments.academicYear', 'enrollments.classRoom', 'enrollments.section',
        ]));
    }

    public function update(Request $request, Student $student): StudentResource
    {
        $data = $request->validate($this->rules($student->campus_id, $student->id, false));

        DB::transaction(function () use ($student, $data) {
            $student->update($this->profileAttributes($data));

            if (array_key_exists('guardians', $data)) {
                $this->syncGuardians($student, $data['guardians'] ?? []);
            }
        });

        return new StudentResource($student->refresh()->load(['guardians', 'enrollments.classRoom', 'enrollments.section']));
    }

    public function destroy(Student $student): JsonResponse
    {
        $student->delete();

        return response()->json(['message' => 'Student archived.']);
    }

    public function withdraw(Request $request, Student $student): StudentResource
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in([StudentStatus::Withdrawn->value, StudentStatus::Transferred->value])],
            'date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $status = $data['status'] ?? StudentStatus::Withdrawn->value;
        $date = $data['date'] ?? now()->toDateString();

        DB::transaction(function () use ($student, $status, $date, $data) {
            $student->update(['status' => $status]);

            $student->enrollments()
                ->where('status', EnrollmentStatus::Active->value)
                ->update([
                    'status' => $status === StudentStatus::Transferred->value
                        ? EnrollmentStatus::Transferred->value
                        : EnrollmentStatus::Withdrawn->value,
                    'ends_on' => $date,
                    'notes' => $data['notes'] ?? null,
                ]);
        });

        return new StudentResource($student->refresh()->load(['guardians', 'enrollments.classRoom', 'enrollments.section']));
    }

    public function promote(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'from_academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'to_academic_year_id' => [
                'required', 'integer', 'different:from_academic_year_id',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'from_class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'to_class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'section_id' => [
                'nullable', 'integer',
                Rule::exists('sections', 'id')->where('class_room_id', $request->integer('to_class_room_id'))->whereNull('deleted_at'),
            ],
            'repeat_student_ids' => ['sometimes', 'array'],
            'repeat_student_ids.*' => ['integer'],
        ]);

        $repeatIds = $data['repeat_student_ids'] ?? [];

        $promoted = DB::transaction(function () use ($data, $tenant, $repeatIds) {
            $enrollments = StudentEnrollment::query()
                ->where('academic_year_id', $data['from_academic_year_id'])
                ->where('class_room_id', $data['from_class_room_id'])
                ->where('status', EnrollmentStatus::Active->value)
                ->with('student')
                ->get();

            $count = 0;

            foreach ($enrollments as $enrollment) {
                if ($enrollment->student === null) {
                    continue;
                }

                $repeat = in_array($enrollment->student_id, $repeatIds, true);

                $enrollment->update(['status' => $repeat ? EnrollmentStatus::Repeated->value : EnrollmentStatus::Promoted->value]);

                StudentEnrollment::updateOrCreate(
                    [
                        'student_id' => $enrollment->student_id,
                        'academic_year_id' => $data['to_academic_year_id'],
                    ],
                    [
                        ...$tenant,
                        'class_room_id' => $data['to_class_room_id'],
                        'section_id' => $data['section_id'] ?? null,
                        'status' => EnrollmentStatus::Active->value,
                        'starts_on' => now()->toDateString(),
                    ]
                );

                $count++;
            }

            return $count;
        });

        return response()->json([
            'message' => "Promoted {$promoted} student(s).",
            'promoted' => $promoted,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function profileAttributes(array $data): array
    {
        $fields = [
            'first_name', 'last_name', 'gender', 'date_of_birth', 'blood_group',
            'nationality', 'religion', 'category', 'national_id', 'email', 'phone',
            'address', 'city', 'previous_school', 'admission_date', 'photo_path', 'notes',
        ];

        $attributes = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $attributes[$field] = $data[$field];
            }
        }

        return $attributes;
    }

    /**
     * @param  array<int, array<string, mixed>>  $guardians
     */
    private function syncGuardians(Student $student, array $guardians): void
    {
        $sync = [];
        foreach ($guardians as $guardian) {
            $sync[$guardian['guardian_id']] = [
                'relationship' => $guardian['relationship'],
                'is_primary' => $guardian['is_primary'] ?? false,
                'is_emergency_contact' => $guardian['is_emergency_contact'] ?? false,
            ];
        }

        $student->guardians()->sync($sync);
    }

    /**
     * @param  array<string, mixed>  $enrollment
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    private function createEnrollment(Student $student, array $enrollment, array $tenant): StudentEnrollment
    {
        $sectionId = $enrollment['section_id'] ?? null;

        if ($sectionId !== null) {
            $belongs = Section::query()->whereKey($sectionId)->where('class_room_id', $enrollment['class_room_id'])->exists();
            if (! $belongs) {
                abort(422, 'The selected section does not belong to the selected class.');
            }
        }

        return StudentEnrollment::create([
            ...$tenant,
            'student_id' => $student->id,
            'academic_year_id' => $enrollment['academic_year_id'],
            'class_room_id' => $enrollment['class_room_id'],
            'section_id' => $sectionId,
            'roll_number' => $enrollment['roll_number'] ?? null,
            'status' => EnrollmentStatus::Active->value,
            'starts_on' => $enrollment['starts_on'] ?? now()->toDateString(),
        ]);
    }

    private function generateAdmissionNo(int $campusId): string
    {
        $sequence = Student::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $admissionNo = sprintf('ADM-%05d', $sequence);
            $sequence++;
        } while (Student::withTrashed()->where('campus_id', $campusId)->where('admission_no', $admissionNo)->exists());

        return $admissionNo;
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'admission_no' => [
                'nullable', 'string', 'max:32',
                Rule::unique('students', 'admission_no')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'first_name' => [$presence, 'string', 'max:100'],
            'last_name' => [$presence, 'string', 'max:100'],
            'gender' => [$presence, Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'blood_group' => ['nullable', 'string', 'max:8'],
            'nationality' => ['nullable', 'string', 'max:64'],
            'religion' => ['nullable', 'string', 'max:64'],
            'category' => ['nullable', 'string', 'max:64'],
            'national_id' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:191'],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'previous_school' => ['nullable', 'string', 'max:191'],
            'admission_date' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(array_map(fn ($case) => $case->value, StudentStatus::cases()))],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'guardians' => ['sometimes', 'array'],
            'guardians.*.guardian_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('guardians', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'guardians.*.relationship' => ['required', Rule::in(['father', 'mother', 'guardian', 'other'])],
            'guardians.*.is_primary' => ['sometimes', 'boolean'],
            'guardians.*.is_emergency_contact' => ['sometimes', 'boolean'],
            'enrollment' => ['sometimes', 'array'],
            'enrollment.academic_year_id' => [
                'required_with:enrollment', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'enrollment.class_room_id' => [
                'required_with:enrollment', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'enrollment.section_id' => ['nullable', 'integer'],
            'enrollment.roll_number' => ['nullable', 'string', 'max:32'],
            'enrollment.starts_on' => ['nullable', 'date'],
        ];
    }
}
