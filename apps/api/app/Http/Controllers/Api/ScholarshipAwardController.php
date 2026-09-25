<?php

namespace App\Http\Controllers\Api;

use App\Enums\ScholarshipAwardStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScholarshipAwardResource;
use App\Models\ScholarshipAward;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScholarshipAwardController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $awards = ScholarshipAward::query()
            ->with(['scholarship', 'student'])
            ->when($request->filled('scholarship_id'), fn ($q) => $q->where('scholarship_id', $request->integer('scholarship_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('awarded_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ScholarshipAwardResource::collection($awards);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'scholarship_id' => [
                'required', 'integer',
                Rule::exists('scholarships', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'awarded_on' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::enum(ScholarshipAwardStatus::class)],
            'value_override' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $award = ScholarshipAward::create($data + $tenant + [
                'awarded_on' => $data['awarded_on'] ?? now()->toDateString(),
                'status' => $data['status'] ?? ScholarshipAwardStatus::Active,
                'approved_by' => $request->user()->id,
            ]);
        } catch (QueryException $exception) {
            if (str_contains($exception->getMessage(), 'scholarship_award_unique')) {
                throw ValidationException::withMessages([
                    'student_id' => ['This student already holds this scholarship for the academic year.'],
                ]);
            }

            throw $exception;
        }

        return (new ScholarshipAwardResource($award->load(['scholarship', 'student'])))
            ->response()->setStatusCode(201);
    }

    public function show(ScholarshipAward $scholarshipAward): ScholarshipAwardResource
    {
        return new ScholarshipAwardResource($scholarshipAward->load(['scholarship', 'student', 'approvedBy']));
    }

    public function revoke(Request $request, ScholarshipAward $scholarshipAward): ScholarshipAwardResource
    {
        if ($scholarshipAward->status === ScholarshipAwardStatus::Revoked) {
            throw ValidationException::withMessages([
                'status' => ['The award is already revoked.'],
            ]);
        }

        $data = $request->validate(['notes' => ['nullable', 'string', 'max:2000']]);

        $scholarshipAward->forceFill([
            'status' => ScholarshipAwardStatus::Revoked,
            'revoked_on' => now()->toDateString(),
            'notes' => $data['notes'] ?? $scholarshipAward->notes,
        ])->save();

        return new ScholarshipAwardResource($scholarshipAward->refresh()->load(['scholarship', 'student']));
    }

    public function destroy(ScholarshipAward $scholarshipAward): JsonResponse
    {
        $scholarshipAward->delete();

        return response()->json(['message' => 'Scholarship award archived.']);
    }
}
