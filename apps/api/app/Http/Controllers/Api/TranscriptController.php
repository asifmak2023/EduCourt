<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Term;
use App\Services\Academics\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TranscriptController extends Controller
{
    public function __construct(private readonly CreditService $credits) {}

    public function show(Student $student): JsonResponse
    {
        return response()->json([
            'data' => $this->credits->transcript($student),
        ]);
    }

    public function term(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'term_id' => ['required', 'integer'],
        ]);

        $term = Term::query()->whereKey($data['term_id'])->firstOrFail();

        return response()->json([
            'data' => $this->credits->termGpa($student, $term),
        ]);
    }
}
