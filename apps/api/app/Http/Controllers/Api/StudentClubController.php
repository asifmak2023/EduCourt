<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClubMembershipResource;
use App\Http\Resources\StudentClubResource;
use App\Models\ClubMembership;
use App\Models\StudentClub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentClubController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $clubs = StudentClub::query()
            ->with('patron')
            ->withCount('memberships')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return StudentClubResource::collection($clubs);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $club = StudentClub::create($data + $tenant + [
            'is_active' => $data['is_active'] ?? true,
        ]);

        return (new StudentClubResource($club))->response()->setStatusCode(201);
    }

    public function show(StudentClub $club): StudentClubResource
    {
        return new StudentClubResource($club->load('patron')->loadCount('memberships'));
    }

    public function update(Request $request, StudentClub $club): StudentClubResource
    {
        $club->update($request->validate($this->rules($club->campus_id, $club->id, false)));

        return new StudentClubResource($club->load('patron'));
    }

    public function destroy(StudentClub $club): JsonResponse
    {
        $club->delete();

        return response()->json(['message' => 'Club removed.']);
    }

    public function memberships(Request $request, StudentClub $club): AnonymousResourceCollection
    {
        $memberships = ClubMembership::query()
            ->with('student')
            ->where('student_club_id', $club->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('id')
            ->paginate($request->integer('per_page', 50));

        return ClubMembershipResource::collection($memberships);
    }

    public function addMember(Request $request, StudentClub $club): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])],
            'role' => ['nullable', 'string', 'max:64'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'graduated'])],
            'joined_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $membership = ClubMembership::updateOrCreate(
            ['student_club_id' => $club->id, 'student_id' => $data['student_id']],
            $data + $tenant + ['status' => $data['status'] ?? 'active'],
        );

        return (new ClubMembershipResource($membership->load('student')))->response()->setStatusCode(201);
    }

    public function removeMember(StudentClub $club, ClubMembership $membership): JsonResponse
    {
        abort_unless($membership->student_club_id === $club->id, 404);

        $membership->delete();

        return response()->json(['message' => 'Membership removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('student_clubs', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'category' => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string'],
            'patron_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
