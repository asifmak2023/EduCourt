<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CouncilMemberResource;
use App\Models\CouncilMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CouncilMemberController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $members = CouncilMember::query()
            ->with('student')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('term'), fn ($q) => $q->where('term', $request->string('term')))
            ->orderBy('position')
            ->paginate($request->integer('per_page', 50));

        return CouncilMemberResource::collection($members);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $member = CouncilMember::create($data + $tenant);

        return (new CouncilMemberResource($member->load('student')))->response()->setStatusCode(201);
    }

    public function show(CouncilMember $councilMember): CouncilMemberResource
    {
        return new CouncilMemberResource($councilMember->load('student'));
    }

    public function update(Request $request, CouncilMember $councilMember): CouncilMemberResource
    {
        $councilMember->update($request->validate($this->rules($councilMember->campus_id, false)));

        return new CouncilMemberResource($councilMember->load('student'));
    }

    public function destroy(CouncilMember $councilMember): JsonResponse
    {
        $councilMember->delete();

        return response()->json(['message' => 'Council member removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [$presence, 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'position' => [$presence, 'string', 'max:64'],
            'term' => ['nullable', 'string', 'max:64'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
