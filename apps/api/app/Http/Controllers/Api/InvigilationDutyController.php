<?php

namespace App\Http\Controllers\Api;

use App\Enums\InvigilationRole;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\InvigilationDutyResource;
use App\Models\InvigilationDuty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class InvigilationDutyController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $duties = InvigilationDuty::query()
            ->with(['user', 'examPaper.subject'])
            ->when($request->filled('exam_paper_id'), fn ($q) => $q->where('exam_paper_id', $request->integer('exam_paper_id')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return InvigilationDutyResource::collection($duties);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $exists = InvigilationDuty::query()
            ->where('exam_paper_id', $data['exam_paper_id'])
            ->where('user_id', $data['user_id'])
            ->exists();

        if ($exists) {
            abort(422, 'This user is already assigned to the paper.');
        }

        $duty = InvigilationDuty::create($data + $tenant);

        return (new InvigilationDutyResource($duty->load('user')))->response()->setStatusCode(201);
    }

    public function show(InvigilationDuty $invigilationDuty): InvigilationDutyResource
    {
        return new InvigilationDutyResource($invigilationDuty->load(['user', 'examPaper.subject']));
    }

    public function update(Request $request, InvigilationDuty $invigilationDuty): InvigilationDutyResource
    {
        $data = $request->validate([
            'role' => ['sometimes', Rule::enum(InvigilationRole::class)],
            'notes' => ['nullable', 'string'],
        ]);

        $invigilationDuty->update($data);

        return new InvigilationDutyResource($invigilationDuty->load('user'));
    }

    public function destroy(InvigilationDuty $invigilationDuty): JsonResponse
    {
        $invigilationDuty->delete();

        return response()->json(['message' => 'Invigilation duty removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId): array
    {
        return [
            'exam_paper_id' => [
                'required', 'integer',
                Rule::exists('exam_papers', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'user_id' => [
                'required', 'integer',
                Rule::exists('users', 'id'),
            ],
            'role' => ['sometimes', Rule::enum(InvigilationRole::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
