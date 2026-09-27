<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportTeamMemberResource;
use App\Http\Resources\SportTeamResource;
use App\Models\SportTeam;
use App\Models\SportTeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SportTeamController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $teams = SportTeam::query()
            ->with(['sport', 'coach'])
            ->withCount('members')
            ->when($request->filled('sport_id'), fn ($q) => $q->where('sport_id', $request->integer('sport_id')))
            ->when($request->filled('age_group'), fn ($q) => $q->where('age_group', $request->string('age_group')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return SportTeamResource::collection($teams);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $team = SportTeam::create($data + $tenant + ['is_active' => $data['is_active'] ?? true]);

        return (new SportTeamResource($team->load('sport', 'coach')))->response()->setStatusCode(201);
    }

    public function show(SportTeam $team): SportTeamResource
    {
        return new SportTeamResource($team->load('sport', 'coach')->loadCount('members'));
    }

    public function update(Request $request, SportTeam $team): SportTeamResource
    {
        $team->update($request->validate($this->rules($team->campus_id, false)));

        return new SportTeamResource($team->load('sport', 'coach'));
    }

    public function destroy(SportTeam $team): JsonResponse
    {
        $team->delete();

        return response()->json(['message' => 'Team removed.']);
    }

    public function members(Request $request, SportTeam $team): AnonymousResourceCollection
    {
        $members = SportTeamMember::query()
            ->with('student')
            ->where('sport_team_id', $team->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('id')
            ->paginate($request->integer('per_page', 50));

        return SportTeamMemberResource::collection($members);
    }

    public function addMember(Request $request, SportTeam $team): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])],
            'position' => ['nullable', 'string', 'max:64'],
            'jersey_no' => ['nullable', 'string', 'max:16'],
            'joined_on' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'left'])],
            'notes' => ['nullable', 'string'],
        ]);

        $member = SportTeamMember::updateOrCreate(
            ['sport_team_id' => $team->id, 'student_id' => $data['student_id']],
            $data + $tenant + ['status' => $data['status'] ?? 'active'],
        );

        return (new SportTeamMemberResource($member->load('student')))->response()->setStatusCode(201);
    }

    public function removeMember(SportTeam $team, SportTeamMember $member): JsonResponse
    {
        abort_unless($member->sport_team_id === $team->id, 404);

        $member->delete();

        return response()->json(['message' => 'Team member removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'sport_id' => [$presence, 'integer', Rule::exists('sports', 'id')->where('campus_id', $campusId)],
            'name' => [$presence, 'string', 'max:255'],
            'age_group' => ['nullable', 'string', 'max:32'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'mixed'])],
            'coach_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
