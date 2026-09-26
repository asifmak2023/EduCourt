<?php

namespace App\Http\Controllers\Api;

use App\Enums\IncomeCategory;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\IncomeSourceResource;
use App\Models\IncomeSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class IncomeSourceController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $sources = IncomeSource::query()
            ->with('incomeAccount')
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return IncomeSourceResource::collection($sources);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $source = IncomeSource::create($data + $tenant);

        return (new IncomeSourceResource($source->load('incomeAccount')))->response()->setStatusCode(201);
    }

    public function show(IncomeSource $incomeSource): IncomeSourceResource
    {
        return new IncomeSourceResource($incomeSource->load('incomeAccount'));
    }

    public function update(Request $request, IncomeSource $incomeSource): IncomeSourceResource
    {
        $data = $request->validate($this->rules($incomeSource->campus_id, $incomeSource->id, false));

        $incomeSource->update($data);

        return new IncomeSourceResource($incomeSource->load('incomeAccount'));
    }

    public function destroy(IncomeSource $incomeSource): JsonResponse
    {
        $incomeSource->delete();

        return response()->json(['message' => 'Income source removed.']);
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
                Rule::unique('income_sources', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'category' => [$presence, Rule::enum(IncomeCategory::class)],
            'income_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')->where('campus_id', $campusId)->where('is_group', false),
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
