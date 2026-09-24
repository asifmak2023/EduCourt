<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeHeadResource;
use App\Models\FeeHead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class FeeHeadController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $heads = FeeHead::query()
            ->with('incomeAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('code')
            ->paginate($request->integer('per_page', 50));

        return FeeHeadResource::collection($heads);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $head = FeeHead::create($data);

        return (new FeeHeadResource($head->load('incomeAccount')))->response()->setStatusCode(201);
    }

    public function show(FeeHead $feeHead): FeeHeadResource
    {
        return new FeeHeadResource($feeHead->load('incomeAccount'));
    }

    public function update(Request $request, FeeHead $feeHead): FeeHeadResource
    {
        $data = $request->validate($this->rules($feeHead->campus_id, $feeHead->id, false));

        $feeHead->update($data);

        return new FeeHeadResource($feeHead->load('incomeAccount'));
    }

    public function destroy(FeeHead $feeHead): JsonResponse
    {
        if ($feeHead->planItems()->exists()) {
            return response()->json([
                'message' => 'Fee head is used by a fee plan and cannot be archived.',
            ], 409);
        }

        $feeHead->delete();

        return response()->json(['message' => 'Fee head archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('fee_heads', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:1000'],
            'income_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'income')
                    ->where('is_group', false)
                    ->whereNull('deleted_at'),
            ],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
