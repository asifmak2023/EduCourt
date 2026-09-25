<?php

namespace App\Http\Controllers\Api;

use App\Enums\AssetStatus;
use App\Enums\DepreciationMethod;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AssetController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $assets = Asset::query()
            ->with('chartOfAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('serial_no', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')->toString()))
            ->orderBy('code')
            ->paginate($request->integer('per_page', 50));

        return AssetResource::collection($assets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $asset = Asset::create($data + $tenant);

        return (new AssetResource($asset->load('chartOfAccount')))->response()->setStatusCode(201);
    }

    public function show(Asset $asset): AssetResource
    {
        return new AssetResource($asset->load('chartOfAccount'));
    }

    public function update(Request $request, Asset $asset): AssetResource
    {
        $data = $request->validate($this->rules($asset->campus_id, $asset->id, false));

        $asset->update($data);

        return new AssetResource($asset->load('chartOfAccount'));
    }

    public function destroy(Asset $asset): JsonResponse
    {
        $asset->delete();

        return response()->json(['message' => 'Asset archived.']);
    }

    public function dispose(Request $request, Asset $asset): AssetResource
    {
        if (! $asset->isActive()) {
            throw ValidationException::withMessages([
                'status' => ['Only active assets can be disposed.'],
            ]);
        }

        $data = $request->validate([
            'disposed_on' => ['required', 'date'],
            'disposal_proceeds' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $asset->update([
            'status' => AssetStatus::Disposed,
            'disposed_on' => $data['disposed_on'],
            'disposal_proceeds' => $data['disposal_proceeds'] ?? 0,
            'notes' => $data['notes'] ?? $asset->notes,
        ]);

        return new AssetResource($asset->refresh()->load('chartOfAccount'));
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
                Rule::unique('assets', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'category' => ['nullable', 'string', 'max:64'],
            'serial_no' => ['nullable', 'string', 'max:64'],
            'location' => ['nullable', 'string', 'max:191'],
            'custodian' => ['nullable', 'string', 'max:191'],
            'acquisition_date' => [$presence, 'date'],
            'acquisition_cost' => [$presence, 'numeric', 'min:0'],
            'salvage_value' => ['nullable', 'numeric', 'min:0'],
            'useful_life_months' => ['nullable', 'integer', 'min:1'],
            'depreciation_method' => [$presence, Rule::enum(DepreciationMethod::class)],
            'status' => ['sometimes', Rule::enum(AssetStatus::class)],
            'disposed_on' => ['nullable', 'date'],
            'disposal_proceeds' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'chart_of_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'asset')
                    ->where('is_group', false)
                    ->whereNull('deleted_at'),
            ],
        ];
    }
}
