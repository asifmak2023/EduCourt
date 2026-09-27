<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourseRegistrationResource;
use App\Models\ClassRoom;
use App\Models\CourseRegistration;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Term;
use App\Services\Academics\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CourseRegistrationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly CreditService $credits) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $registrations = CourseRegistration::query()
            ->with(['student', 'term', 'subject'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CourseRegistrationResource::collection($registrations);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'term_id' => ['required', 'integer', Rule::exists('terms', 'id')->whereNull('deleted_at')],
            'subject_id' => ['required', 'integer', Rule::exists('subjects', 'id')->whereNull('deleted_at')],
            'class_room_id' => ['nullable', 'integer', Rule::exists('class_rooms', 'id')->whereNull('deleted_at')],
            'credit_hours' => ['nullable', 'numeric', 'min:0', 'max:30'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $registration = $this->credits->register(
            $tenant,
            Student::query()->whereKey($data['student_id'])->firstOrFail(),
            Term::query()->whereKey($data['term_id'])->firstOrFail(),
            Subject::query()->whereKey($data['subject_id'])->firstOrFail(),
            isset($data['class_room_id']) ? ClassRoom::query()->whereKey($data['class_room_id'])->firstOrFail() : null,
            isset($data['credit_hours']) ? (float) $data['credit_hours'] : null,
            $data['remarks'] ?? null,
        );

        return (new CourseRegistrationResource($registration->load(['student', 'term', 'subject'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(CourseRegistration $registration): CourseRegistrationResource
    {
        return new CourseRegistrationResource($registration->load(['student', 'term', 'subject']));
    }

    public function drop(CourseRegistration $registration): CourseRegistrationResource
    {
        $registration = $this->credits->drop($registration);

        return new CourseRegistrationResource($registration->load(['student', 'term', 'subject']));
    }

    public function destroy(CourseRegistration $registration): JsonResponse
    {
        $registration->delete();

        return response()->json(['message' => 'Course registration removed.']);
    }
}
