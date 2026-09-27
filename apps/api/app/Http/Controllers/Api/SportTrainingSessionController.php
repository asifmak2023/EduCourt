<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportTrainingSessionResource;
use App\Models\SportTrainingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SportTrainingSessionController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $sessions = SportTrainingSession::query()
            ->with('team')
            ->when($request->filled('sport_team_id'), fn ($q) => $q->where('sport_team_id', $request->integer('sport_team_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('session_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('session_date', '<=', $request->date('to')))
            ->orderByDesc('session_date')
            ->paginate($request->integer('per_page', 50));

        return SportTrainingSessionResource::collection($sessions);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $session = SportTrainingSession::create($data + $tenant + [
            'created_by' => $request->user()?->id,
        ]);

        return (new SportTrainingSessionResource($session->load('team')))->response()->setStatusCode(201);
    }

    public function show(SportTrainingSession $trainingSession): SportTrainingSessionResource
    {
        return new SportTrainingSessionResource($trainingSession->load('team'));
    }

    public function update(Request $request, SportTrainingSession $trainingSession): SportTrainingSessionResource
    {
        $trainingSession->update($request->validate($this->rules($trainingSession->campus_id, false)));

        return new SportTrainingSessionResource($trainingSession->load('team'));
    }

    public function destroy(SportTrainingSession $trainingSession): JsonResponse
    {
        $trainingSession->delete();

        return response()->json(['message' => 'Training session removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'sport_team_id' => [$presence, 'integer', Rule::exists('sport_teams', 'id')->where('campus_id', $campusId)],
            'title' => [$presence, 'string', 'max:255'],
            'session_date' => [$presence, 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'venue' => ['nullable', 'string', 'max:255'],
            'focus' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
