<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CounsellingSessionResource;
use App\Models\CounsellingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CounsellingSessionController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $sessions = CounsellingSession::query()
            ->with(['student', 'counsellor'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('counsellor_user_id'), fn ($q) => $q->where('counsellor_user_id', $request->integer('counsellor_user_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('session_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('session_date', '<=', $request->date('to')))
            ->orderByDesc('session_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CounsellingSessionResource::collection($sessions);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $session = CounsellingSession::create($data + $tenant + [
            'status' => $data['status'] ?? 'scheduled',
            'type' => $data['type'] ?? 'individual',
        ]);

        return (new CounsellingSessionResource($session->load(['student', 'counsellor'])))->response()->setStatusCode(201);
    }

    public function show(CounsellingSession $counsellingSession): CounsellingSessionResource
    {
        return new CounsellingSessionResource($counsellingSession->load(['student', 'counsellor']));
    }

    public function update(Request $request, CounsellingSession $counsellingSession): CounsellingSessionResource
    {
        $counsellingSession->update($request->validate($this->rules($counsellingSession->campus_id, false)));

        return new CounsellingSessionResource($counsellingSession->load(['student', 'counsellor']));
    }

    public function destroy(CounsellingSession $counsellingSession): JsonResponse
    {
        $counsellingSession->delete();

        return response()->json(['message' => 'Counselling session removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [$presence, 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'counsellor_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'session_date' => [$presence, 'date'],
            'type' => ['sometimes', Rule::in(['individual', 'group', 'follow_up'])],
            'status' => ['sometimes', Rule::in(['scheduled', 'completed', 'cancelled'])],
            'summary' => ['nullable', 'string'],
            'confidential_notes' => ['nullable', 'string'],
            'follow_up_on' => ['nullable', 'date'],
        ];
    }
}
