<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\InventoryCategoryResource;
use App\Models\InventoryCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryCategoryController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $categories = InventoryCategory::query()
            ->withCount('items')
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return InventoryCategoryResource::collection($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $category = InventoryCategory::create($data + $tenant);

        return (new InventoryCategoryResource($category))->response()->setStatusCode(201);
    }

    public function show(InventoryCategory $inventoryCategory): InventoryCategoryResource
    {
        return new InventoryCategoryResource($inventoryCategory->loadCount('items'));
    }

    public function update(Request $request, InventoryCategory $inventoryCategory): InventoryCategoryResource
    {
        $inventoryCategory->update($request->validate($this->rules($inventoryCategory->campus_id, false)));

        return new InventoryCategoryResource($inventoryCategory->refresh()->loadCount('items'));
    }

    public function destroy(InventoryCategory $inventoryCategory): JsonResponse
    {
        $inventoryCategory->delete();

        return response()->json(['message' => 'Inventory category removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32'],
            'description' => ['nullable', 'string'],
        ];
    }
}
