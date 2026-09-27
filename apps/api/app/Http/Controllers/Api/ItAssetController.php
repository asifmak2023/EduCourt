<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItAssetAssignmentResource;
use App\Http\Resources\ItAssetResource;
use App\Models\ItAsset;
use App\Services\It\ItService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ItAssetController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ItService $it) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $assets = ItAsset::query()
            ->with('assignedUser')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('assigned_to', $request->integer('assigned_to')))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', '%'.$request->string('search').'%')
                ->orWhere('asset_tag', 'like', '%'.$request->string('search').'%')
                ->orWhere('serial_no', 'like', '%'.$request->string('search').'%')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return ItAssetResource::collection($assets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $asset = ItAsset::create($data + $tenant + [
            'category' => $data['category'] ?? 'laptop',
            'status' => $data['status'] ?? 'available',
        ]);

        return (new ItAssetResource($asset->load('assignedUser')))->response()->setStatusCode(201);
    }

    public function show(ItAsset $asset): ItAssetResource
    {
        return new ItAssetResource($asset->load('assignedUser'));
    }

    public function update(Request $request, ItAsset $asset): ItAssetResource
    {
        $asset->update($request->validate($this->rules($asset->campus_id, $asset->id, false)));

        return new ItAssetResource($asset->load('assignedUser'));
    }

    public function destroy(ItAsset $asset): JsonResponse
    {
        $asset->delete();

        return response()->json(['message' => 'IT asset removed.']);
    }

    public function assignments(ItAsset $asset): AnonymousResourceCollection
    {
        $assignments = $asset->assignments()
            ->with('assignee')
            ->orderByDesc('assigned_on')
            ->paginate(50);

        return ItAssetAssignmentResource::collection($assignments);
    }

    public function assign(Request $request, ItAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'assigned_to' => ['required', 'integer', Rule::exists('users', 'id')],
            'assigned_on' => ['nullable', 'date'],
            'condition' => ['nullable', Rule::in(['good', 'fair', 'damaged'])],
            'notes' => ['nullable', 'string'],
        ]);

        $assignment = $this->it->assignAsset($asset, $data, $request->user()?->id);

        return (new ItAssetAssignmentResource($assignment->load('assignee')))->response()->setStatusCode(201);
    }

    public function returnAsset(Request $request, ItAsset $asset): ItAssetResource
    {
        $data = $request->validate([
            'returned_on' => ['nullable', 'date'],
            'condition' => ['nullable', Rule::in(['good', 'fair', 'damaged'])],
            'status' => ['nullable', Rule::in(['available', 'repair', 'retired'])],
            'notes' => ['nullable', 'string'],
        ]);

        return new ItAssetResource($this->it->returnAsset($asset, $data)->load('assignedUser'));
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'asset_tag' => [
                $presence, 'string', 'max:64',
                Rule::unique('it_assets', 'asset_tag')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'category' => ['sometimes', Rule::in(['laptop', 'desktop', 'printer', 'network', 'server', 'projector', 'phone', 'software', 'other'])],
            'brand' => ['nullable', 'string', 'max:96'],
            'model_no' => ['nullable', 'string', 'max:96'],
            'serial_no' => ['nullable', 'string', 'max:96'],
            'purchase_date' => ['nullable', 'date'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'warranty_until' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['available', 'assigned', 'repair', 'retired'])],
            'location' => ['nullable', 'string', 'max:255'],
            'vendor' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
