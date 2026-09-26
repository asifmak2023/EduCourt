<?php

namespace App\Http\Controllers\Api;

use App\Enums\TaxAppliesTo;
use App\Enums\TaxType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TaxRuleResource;
use App\Models\TaxRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TaxRuleController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $rules = TaxRule::query()
            ->with('taxAccount')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('applies_to'), fn ($q) => $q->where('applies_to', $request->string('applies_to')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return TaxRuleResource::collection($rules);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $rule = TaxRule::create($data + $tenant);

        return (new TaxRuleResource($rule->load('taxAccount')))->response()->setStatusCode(201);
    }

    public function show(TaxRule $taxRule): TaxRuleResource
    {
        return new TaxRuleResource($taxRule->load('taxAccount'));
    }

    public function update(Request $request, TaxRule $taxRule): TaxRuleResource
    {
        $data = $request->validate($this->rules($taxRule->campus_id, $taxRule->id, false));

        $taxRule->update($data);

        return new TaxRuleResource($taxRule->load('taxAccount'));
    }

    public function destroy(TaxRule $taxRule): JsonResponse
    {
        $taxRule->delete();

        return response()->json(['message' => 'Tax rule removed.']);
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
                Rule::unique('tax_rules', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'type' => [$presence, Rule::enum(TaxType::class)],
            'applies_to' => [$presence, Rule::enum(TaxAppliesTo::class)],
            'rate' => [$presence, 'numeric', 'min:0', 'max:100'],
            'tax_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')->where('campus_id', $campusId)->where('is_group', false),
            ],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
        ];
    }
}
