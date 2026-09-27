<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportAchievementResource;
use App\Models\SportAchievement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SportAchievementController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $achievements = SportAchievement::query()
            ->with(['sport', 'student'])
            ->when($request->filled('sport_id'), fn ($q) => $q->where('sport_id', $request->integer('sport_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('level'), fn ($q) => $q->where('level', $request->string('level')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('achieved_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('achieved_on', '<=', $request->date('to')))
            ->orderByDesc('achieved_on')
            ->paginate($request->integer('per_page', 50));

        return SportAchievementResource::collection($achievements);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $achievement = SportAchievement::create($data + $tenant + [
            'level' => $data['level'] ?? 'school',
        ]);

        return (new SportAchievementResource($achievement->load('sport', 'student')))->response()->setStatusCode(201);
    }

    public function show(SportAchievement $achievement): SportAchievementResource
    {
        return new SportAchievementResource($achievement->load('sport', 'student'));
    }

    public function update(Request $request, SportAchievement $achievement): SportAchievementResource
    {
        $achievement->update($request->validate($this->rules($achievement->campus_id, false)));

        return new SportAchievementResource($achievement->load('sport', 'student'));
    }

    public function destroy(SportAchievement $achievement): JsonResponse
    {
        $achievement->delete();

        return response()->json(['message' => 'Achievement removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'sport_id' => [$presence, 'integer', Rule::exists('sports', 'id')->where('campus_id', $campusId)],
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'title' => [$presence, 'string', 'max:255'],
            'level' => ['sometimes', Rule::in(['school', 'district', 'state', 'national', 'international'])],
            'position' => ['nullable', 'string', 'max:64'],
            'achieved_on' => [$presence, 'date'],
            'description' => ['nullable', 'string'],
        ];
    }
}
