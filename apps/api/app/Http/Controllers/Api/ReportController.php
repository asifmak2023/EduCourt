<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\Student;
use App\Services\Reports\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function campusDashboard(): JsonResponse
    {
        return response()->json(['data' => $this->reports->campusDashboard()]);
    }

    public function progress(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
        ]);

        return response()->json(['data' => $this->reports->progressReport($filters)]);
    }

    public function attendance(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'class_room_id' => ['nullable', 'integer', 'exists:class_rooms,id'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(['data' => $this->reports->attendanceSummary($filters)]);
    }

    public function results(Exam $exam): JsonResponse
    {
        return response()->json(['data' => $this->reports->resultSummary($exam)]);
    }

    public function staff(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'as_on' => ['nullable', 'date'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(['data' => $this->reports->staffSummary($filters)]);
    }

    public function studentYearly(Student $student): JsonResponse
    {
        return response()->json(['data' => $this->reports->studentYearlyAnalysis($student)]);
    }

    public function financial(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'fiscal_year_id' => ['nullable', 'integer', 'exists:fiscal_years,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(['data' => $this->reports->financialSummary($filters)]);
    }

    public function payroll(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(['data' => $this->reports->payrollSummary($filters)]);
    }
}
