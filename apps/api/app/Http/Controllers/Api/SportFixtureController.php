<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportFixtureResource;
use App\Models\SportFixture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SportFixtureController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $fixtures = SportFixture::query()
            ->with(['sport', 'team'])
            ->when($request->filled('sport_id'), fn ($q) => $q->where('sport_id', $request->integer('sport_id')))
            ->when($request->filled('sport_team_id'), fn ($q) => $q->where('sport_team_id', $request->integer('sport_team_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('outcome'), fn ($q) => $q->where('outcome', $request->string('outcome')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('fixture_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('fixture_date', '<=', $request->date('to')))
            ->orderByDesc('fixture_date')
            ->paginate($request->integer('per_page', 50));

        return SportFixtureResource::collection($fixtures);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $fixture = SportFixture::create($data + $tenant + [
            'status' => $data['status'] ?? 'scheduled',
            'home_away' => $data['home_away'] ?? 'home',
            'created_by' => $request->user()?->id,
        ]);

        return (new SportFixtureResource($fixture->load('sport', 'team')))->response()->setStatusCode(201);
    }

    public function show(SportFixture $fixture): SportFixtureResource
    {
        return new SportFixtureResource($fixture->load('sport', 'team'));
    }

    public function update(Request $request, SportFixture $fixture): SportFixtureResource
    {
        $fixture->update($request->validate($this->rules($fixture->campus_id, false)));

        return new SportFixtureResource($fixture->load('sport', 'team'));
    }

    public function recordResult(Request $request, SportFixture $fixture): SportFixtureResource
    {
        $data = $request->validate([
            'our_score' => ['required', 'integer', 'min:0'],
            'opponent_score' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string'],
        ]);

        $outcome = match (true) {
            $data['our_score'] > $data['opponent_score'] => 'win',
            $data['our_score'] < $data['opponent_score'] => 'loss',
            default => 'draw',
        };

        $fixture->forceFill([
            'our_score' => $data['our_score'],
            'opponent_score' => $data['opponent_score'],
            'outcome' => $outcome,
            'status' => 'completed',
            'remarks' => $data['remarks'] ?? $fixture->remarks,
        ])->save();

        return new SportFixtureResource($fixture->refresh()->load('sport', 'team'));
    }

    public function destroy(SportFixture $fixture): JsonResponse
    {
        $fixture->delete();

        return response()->json(['message' => 'Fixture removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'sport_id' => [$presence, 'integer', Rule::exists('sports', 'id')->where('campus_id', $campusId)],
            'sport_team_id' => ['nullable', 'integer', Rule::exists('sport_teams', 'id')->where('campus_id', $campusId)],
            'opponent' => [$presence, 'string', 'max:255'],
            'home_away' => ['sometimes', Rule::in(['home', 'away', 'neutral'])],
            'venue' => ['nullable', 'string', 'max:255'],
            'fixture_date' => [$presence, 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'status' => ['sometimes', Rule::in(['scheduled', 'completed', 'cancelled'])],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
