<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Student;
use App\Services\Reports\ReportService;
use App\Support\ReportPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function campusDashboard(): JsonResponse
    {
        return response()->json(['data' => $this->reports->campusDashboard()]);
    }

    public function institutionOverview(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->isInstitutionHead() || $request->user()?->isPlatformAdmin(),
            403
        );

        return response()->json(['data' => $this->reports->institutionOverview()]);
    }

    public function campusComparison(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->isInstitutionHead() || $request->user()?->isPlatformAdmin(),
            403
        );

        return response()->json([
            'data' => $this->reports->campusComparison(
                $this->validatedFilters($request)
            ),
        ]);
    }

    public function progress(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, [
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
        ]);

        return response()->json(['data' => $this->reports->progressReport($filters)]);
    }

    public function attendance(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, [
            'class_room_id' => ['nullable', 'integer', 'exists:class_rooms,id'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
        ]);

        return response()->json(['data' => $this->reports->attendanceSummary($filters)]);
    }

    public function results(Exam $exam): JsonResponse
    {
        return response()->json(['data' => $this->reports->resultSummary($exam)]);
    }

    public function staff(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, [
            'as_on' => ['nullable', 'date'],
        ]);

        return response()->json(['data' => $this->reports->staffSummary($filters)]);
    }

    public function studentYearly(Student $student): JsonResponse
    {
        return response()->json(['data' => $this->reports->studentYearlyAnalysis($student)]);
    }

    public function financial(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request, [
            'fiscal_year_id' => ['nullable', 'integer', 'exists:fiscal_years,id'],
        ]);

        return response()->json(['data' => $this->reports->financialSummary($filters)]);
    }

    public function payroll(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);

        return response()->json(['data' => $this->reports->payrollSummary($filters)]);
    }

    /**
     * Shared date-range + granularity validation for every report.
     *
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function validatedFilters(Request $request, array $extra = []): array
    {
        return $request->validate(array_merge([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'granularity' => ['nullable', Rule::in(ReportPeriod::GRANULARITIES)],
        ], $extra));
    }
}
