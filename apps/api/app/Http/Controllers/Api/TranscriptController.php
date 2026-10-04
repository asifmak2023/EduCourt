<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Term;
use App\Services\Access\TeacherScope;
use App\Services\Academics\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TranscriptController extends Controller
{
    public function __construct(
        private readonly CreditService $credits,
        private readonly TeacherScope $teacherScope,
    ) {}

    public function show(Request $request, Student $student): JsonResponse
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $student->id), 403, 'This student is outside your assigned classes.');

        return response()->json([
            'data' => $this->credits->transcript($student),
        ]);
    }

    public function term(Request $request, Student $student): JsonResponse
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $student->id), 403, 'This student is outside your assigned classes.');

        $data = $request->validate([
            'term_id' => ['required', 'integer'],
        ]);

        $term = Term::query()->whereKey($data['term_id'])->firstOrFail();

        return response()->json([
            'data' => $this->credits->termGpa($student, $term),
        ]);
    }
}
