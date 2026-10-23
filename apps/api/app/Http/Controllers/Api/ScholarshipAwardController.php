<?php

namespace App\Http\Controllers\Api;

use App\Enums\ScholarshipAwardStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScholarshipAwardResource;
use App\Models\ScholarshipAward;
use App\Services\Scholarships\ScholarshipService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScholarshipAwardController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request, ScholarshipService $scholarships): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $query = ScholarshipAward::query()
            ->with(['scholarship', 'student', 'academicYear'])
            ->when($search !== '', fn ($q) => $q->whereHas('student', function ($student) use ($search) {
                $student->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            }))
            ->when($request->filled('scholarship_id'), fn ($q) => $q->where('scholarship_id', $request->integer('scholarship_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), function ($query) use ($request) {
                $from = $request->date('from')->toDateString();
                $query->where(function ($inner) use ($from) {
                    $inner->whereDate('ends_on', '>=', $from)
                        ->orWhere(function ($missing) use ($from) {
                            $missing->whereNull('ends_on')->whereDate('awarded_on', '>=', $from);
                        });
                });
            })
            ->when($request->filled('to'), function ($query) use ($request) {
                $to = $request->date('to')->toDateString();
                $query->where(function ($inner) use ($to) {
                    $inner->whereDate('starts_on', '<=', $to)
                        ->orWhere(function ($missing) use ($to) {
                            $missing->whereNull('starts_on')->whereDate('awarded_on', '<=', $to);
                        });
                });
            });

        $matched = (clone $query)->get();
        $scholarships->attachAwardedAmounts($matched);

        $awards = $query
            ->orderByDesc('awarded_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        $scholarships->attachAwardedAmounts($awards->getCollection());

        return ScholarshipAwardResource::collection($awards)->additional([
            'summary' => [
                'total_awarded' => number_format((float) $matched->sum('awarded_amount'), 2, '.', ''),
                'total_monthly' => number_format((float) $matched->sum('monthly_amount'), 2, '.', ''),
                'total_obtained' => number_format((float) $matched->sum('obtained_amount'), 2, '.', ''),
            ],
        ]);
    }

    public function store(Request $request, ScholarshipService $scholarships): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'scholarship_id' => [
                'required', 'integer',
                Rule::exists('scholarships', 'id')
                    ->where('campus_id', $tenant['campus_id'])
                    ->where('is_active', true)
                    ->whereNull('deleted_at'),
            ],
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'awarded_on' => ['nullable', 'date'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'status' => ['sometimes', Rule::enum(ScholarshipAwardStatus::class)],
            'value_override' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $duplicate = ScholarshipAward::query()
            ->where('scholarship_id', $data['scholarship_id'])
            ->where('student_id', $data['student_id'])
            ->when(
                $data['academic_year_id'] ?? null,
                fn ($query, $yearId) => $query->where('academic_year_id', $yearId),
                fn ($query) => $query->whereNull('academic_year_id'),
            )
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'student_id' => ['This student already holds this scholarship for the academic year.'],
            ]);
        }

        try {
            $award = ScholarshipAward::create($data + $tenant + [
                'awarded_on' => $data['awarded_on'] ?? $data['starts_on'],
                'status' => $data['status'] ?? ScholarshipAwardStatus::Active,
                'approved_by' => $request->user()->id,
            ]);
        } catch (QueryException $exception) {
            if (
                str_contains($exception->getMessage(), 'scholarship_award_unique')
                || str_contains($exception->getMessage(), 'scholarship_awards.scholarship_id')
            ) {
                throw ValidationException::withMessages([
                    'student_id' => ['This student already holds this scholarship for the academic year.'],
                ]);
            }

            throw $exception;
        }

        $award->load(['scholarship', 'student', 'academicYear']);
        $scholarships->attachAwardedAmounts(collect([$award]));

        return (new ScholarshipAwardResource($award))
            ->response()->setStatusCode(201);
    }

    public function show(ScholarshipAward $scholarshipAward, ScholarshipService $scholarships): ScholarshipAwardResource
    {
        $scholarshipAward->load(['scholarship', 'student', 'approvedBy', 'academicYear']);
        $scholarships->attachAwardedAmounts(collect([$scholarshipAward]));

        return new ScholarshipAwardResource($scholarshipAward);
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

        $scholarshipAward = $scholarshipAward->refresh()->load(['scholarship', 'student', 'academicYear']);
        app(ScholarshipService::class)->attachAwardedAmounts(collect([$scholarshipAward]));

        return new ScholarshipAwardResource($scholarshipAward);
    }

    public function destroy(ScholarshipAward $scholarshipAward): JsonResponse
    {
        $scholarshipAward->delete();

        return response()->json(['message' => 'Scholarship award archived.']);
    }
}
