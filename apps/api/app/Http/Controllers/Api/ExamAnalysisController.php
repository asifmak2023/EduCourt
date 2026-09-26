<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Services\Exams\ResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExamAnalysisController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ResultService $results) {}

    public function classRoom(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate([
            'class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $exam->campus_id),
            ],
        ]);

        return response()->json([
            'data' => $this->results->classAnalysis($exam, (int) $data['class_room_id']),
        ]);
    }

    public function subject(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate([
            'subject_id' => [
                'required', 'integer',
                Rule::exists('subjects', 'id')->where('campus_id', $exam->campus_id),
            ],
        ]);

        return response()->json([
            'data' => $this->results->subjectAnalysis($exam, (int) $data['subject_id']),
        ]);
    }

    public function teachers(Exam $exam): JsonResponse
    {
        return response()->json([
            'data' => $this->results->teacherAnalysis(
                (int) $exam->campus_id,
                (int) $exam->academic_year_id,
                $exam->id,
            ),
        ]);
    }

    public function yearOnYear(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'exam_type_id' => [
                'required', 'integer',
                Rule::exists('exam_types', 'id')->where('campus_id', $tenant['campus_id']),
            ],
            'class_room_id' => [
                'nullable', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id']),
            ],
        ]);

        return response()->json([
            'data' => $this->results->yearOnYear(
                $tenant['campus_id'],
                (int) $data['exam_type_id'],
                isset($data['class_room_id']) ? (int) $data['class_room_id'] : null,
            ),
        ]);
    }
}
