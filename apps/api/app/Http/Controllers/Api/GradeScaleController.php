<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\GradeScaleResource;
use App\Models\GradeScale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GradeScaleController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $scales = GradeScale::query()
            ->with('items')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return GradeScaleResource::collection($scales);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $scale = DB::transaction(function () use ($data, $tenant) {
            $scale = GradeScale::create(collect($data)->except('items')->all() + $tenant);
            $this->syncItems($scale, $data['items'] ?? []);
            $this->enforceSingleDefault($scale);

            return $scale;
        });

        return (new GradeScaleResource($scale->load('items')))->response()->setStatusCode(201);
    }

    public function show(GradeScale $gradeScale): GradeScaleResource
    {
        return new GradeScaleResource($gradeScale->load('items'));
    }

    public function update(Request $request, GradeScale $gradeScale): GradeScaleResource
    {
        $data = $request->validate($this->rules($gradeScale->campus_id, $gradeScale->id, false));

        DB::transaction(function () use ($gradeScale, $data) {
            $gradeScale->update(collect($data)->except('items')->all());

            if (array_key_exists('items', $data)) {
                $this->syncItems($gradeScale, $data['items']);
            }

            $this->enforceSingleDefault($gradeScale);
        });

        return new GradeScaleResource($gradeScale->load('items'));
    }

    public function destroy(GradeScale $gradeScale): JsonResponse
    {
        $gradeScale->delete();

        return response()->json(['message' => 'Grade scale removed.']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(GradeScale $scale, array $items): void
    {
        $scale->items()->delete();

        foreach (array_values($items) as $index => $item) {
            $scale->items()->create([
                'sequence' => $item['sequence'] ?? $index + 1,
                'grade' => $item['grade'],
                'min_percentage' => $item['min_percentage'],
                'max_percentage' => $item['max_percentage'],
                'points' => $item['points'] ?? null,
                'remark' => $item['remark'] ?? null,
            ]);
        }
    }

    private function enforceSingleDefault(GradeScale $scale): void
    {
        if (! $scale->is_default) {
            return;
        }

        GradeScale::query()
            ->where('campus_id', $scale->campus_id)
            ->whereKeyNot($scale->id)
            ->update(['is_default' => false]);
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
                Rule::unique('grade_scales', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'items' => [$presence, 'array', 'min:1'],
            'items.*.sequence' => ['nullable', 'integer', 'min:1'],
            'items.*.grade' => ['required', 'string', 'max:32'],
            'items.*.min_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'items.*.max_percentage' => ['required', 'numeric', 'min:0', 'max:100', 'gte:items.*.min_percentage'],
            'items.*.points' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'items.*.remark' => ['nullable', 'string', 'max:255'],
        ];
    }
}
