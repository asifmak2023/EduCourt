<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportResource;
use App\Models\Sport;
use App\Models\Student;
use App\Services\Sports\SportsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly SportsService $sports) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $sports = Sport::query()
            ->with('coach')
            ->withCount('teams')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('season'), fn ($q) => $q->where('season', $request->string('season')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return SportResource::collection($sports);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $this->assertAgeRange($data);

        $sport = Sport::create($data + $tenant + [
            'category' => $data['category'] ?? 'outdoor',
            'is_active' => $data['is_active'] ?? true,
        ]);

        return (new SportResource($sport->load('coach')))->response()->setStatusCode(201);
    }

    public function show(Sport $sport): SportResource
    {
        return new SportResource($sport->load('coach')->loadCount('teams'));
    }

    public function update(Request $request, Sport $sport): SportResource
    {
        $data = $request->validate($this->rules($sport->campus_id, $sport->id, false));
        $this->assertAgeRange($data, $sport);

        $sport->update($data);

        return new SportResource($sport->load('coach'));
    }

    public function destroy(Sport $sport): JsonResponse
    {
        $sport->delete();

        return response()->json(['message' => 'Sport removed.']);
    }

    public function eligibility(Sport $sport, Student $student): JsonResponse
    {
        return response()->json(['data' => $this->sports->eligibility($sport, $student)]);
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
                Rule::unique('sports', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'category' => ['sometimes', Rule::in(['indoor', 'outdoor', 'athletics'])],
            'season' => ['nullable', 'string', 'max:32'],
            'coach_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'min_age_years' => ['nullable', 'integer', 'min:1', 'max:100'],
            'max_age_years' => ['nullable', 'integer', 'min:1', 'max:100'],
            'min_attendance_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'rules' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertAgeRange(array $data, ?Sport $existing = null): void
    {
        $min = $data['min_age_years'] ?? $existing?->min_age_years;
        $max = $data['max_age_years'] ?? $existing?->max_age_years;

        if ($min !== null && $max !== null && (int) $max < (int) $min) {
            throw ValidationException::withMessages([
                'max_age_years' => ['The max age years field must be greater than or equal to min age years.'],
            ]);
        }
    }
}
