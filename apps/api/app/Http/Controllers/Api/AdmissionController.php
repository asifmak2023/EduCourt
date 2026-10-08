<?php

namespace App\Http\Controllers\Api;

use App\Enums\AdmissionStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdmissionResource;
use App\Models\Admission;
use App\Services\Admissions\AdmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdmissionController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly AdmissionService $admissions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $admissions = Admission::query()
            ->with(['classRoom', 'academicYear'])
            ->withCount('documents')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('application_no', 'like', "%{$search}%")
                    ->orWhere('guardian_phone', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('gender'), fn ($q) => $q->where('gender', $request->string('gender')->toString()))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('applied_on', '>=', $request->string('date_from')->toString()))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('applied_on', '<=', $request->string('date_to')->toString()))
            ->orderByDesc('applied_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return AdmissionResource::collection($admissions);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $admission = Admission::create($data + $tenant + [
            'application_no' => $this->admissions->nextApplicationNo($tenant['campus_id']),
            'status' => $data['status'] ?? AdmissionStatus::Enquiry,
            'applied_on' => $data['applied_on'] ?? now()->toDateString(),
        ]);

        return (new AdmissionResource($admission->load(['classRoom', 'academicYear'])))
            ->response()->setStatusCode(201);
    }

    public function show(Admission $admission): AdmissionResource
    {
        return new AdmissionResource($admission->load([
            'classRoom', 'academicYear', 'decidedBy', 'documents.uploadedBy',
        ]));
    }

    public function update(Request $request, Admission $admission): AdmissionResource
    {
        if ($admission->isEnrolled()) {
            throw ValidationException::withMessages([
                'status' => ['Enrolled admissions cannot be edited.'],
            ]);
        }

        $data = $request->validate($this->rules($admission->campus_id, false));

        $admission->update($data);

        return new AdmissionResource($admission->refresh()->load(['classRoom', 'academicYear']));
    }

    public function destroy(Admission $admission): JsonResponse
    {
        if ($admission->isEnrolled()) {
            throw ValidationException::withMessages([
                'status' => ['Enrolled admissions cannot be archived.'],
            ]);
        }

        $admission->delete();

        return response()->json(['message' => 'Admission archived.']);
    }

    public function submit(Admission $admission): AdmissionResource
    {
        if (! in_array($admission->status, [AdmissionStatus::Enquiry, AdmissionStatus::Applied], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only enquiries or applications can be submitted for review.'],
            ]);
        }

        $admission->forceFill(['status' => AdmissionStatus::UnderReview])->save();

        return new AdmissionResource($admission->refresh()->load(['classRoom', 'academicYear']));
    }

    public function approve(Request $request, Admission $admission): AdmissionResource
    {
        if (in_array($admission->status, [AdmissionStatus::Rejected, AdmissionStatus::Enrolled], true)) {
            throw ValidationException::withMessages([
                'status' => ['This admission can no longer be approved.'],
            ]);
        }

        $admission->forceFill([
            'status' => AdmissionStatus::Approved,
            'decided_on' => now()->toDateString(),
            'decided_by' => $request->user()->id,
            'rejection_reason' => null,
        ])->save();

        return new AdmissionResource($admission->refresh()->load(['classRoom', 'academicYear', 'decidedBy']));
    }

    public function reject(Request $request, Admission $admission): AdmissionResource
    {
        if ($admission->isEnrolled()) {
            throw ValidationException::withMessages([
                'status' => ['Enrolled admissions cannot be rejected.'],
            ]);
        }

        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ]);

        $admission->forceFill([
            'status' => AdmissionStatus::Rejected,
            'rejection_reason' => $data['rejection_reason'],
            'decided_on' => now()->toDateString(),
            'decided_by' => $request->user()->id,
        ])->save();

        return new AdmissionResource($admission->refresh()->load(['classRoom', 'academicYear', 'decidedBy']));
    }

    public function enroll(Request $request, Admission $admission): JsonResponse
    {
        if ($admission->isEnrolled()) {
            throw ValidationException::withMessages([
                'status' => ['This admission has already been enrolled.'],
            ]);
        }

        $data = $request->validate([
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $admission->campus_id)->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $admission->campus_id)->whereNull('deleted_at'),
            ],
            'section_id' => ['nullable', 'integer'],
            'roll_number' => ['nullable', 'string', 'max:32'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'admission_no' => [
                'nullable', 'string', 'max:32',
                Rule::unique('students', 'admission_no')->where('campus_id', $admission->campus_id),
            ],
            'admission_date' => ['nullable', 'date'],
            'starts_on' => ['nullable', 'date'],
        ]);

        $student = $this->admissions->enroll($admission, $request->user(), $data);

        return (new AdmissionResource(
            $admission->refresh()->load(['classRoom', 'academicYear', 'decidedBy', 'student'])
        ))->additional([
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
            ],
        ])->response()->setStatusCode(201);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'first_name' => [$presence, 'string', 'max:100'],
            'last_name' => [$presence, 'string', 'max:100'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'class_room_id' => [
                'nullable', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'guardian_name' => ['nullable', 'string', 'max:191'],
            'guardian_phone' => ['nullable', 'string', 'max:32'],
            'guardian_email' => ['nullable', 'email', 'max:191'],
            'guardian_relation' => ['nullable', Rule::in(['father', 'mother', 'guardian', 'other'])],
            'previous_school' => ['nullable', 'string', 'max:191'],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::enum(AdmissionStatus::class)],
            'applied_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
