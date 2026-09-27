<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\InventoryItemResource;
use App\Http\Resources\InventoryStockMovementResource;
use App\Models\InventoryItem;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly InventoryService $inventory) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = InventoryItem::query()
            ->with('category')
            ->when($request->filled('inventory_category_id'), fn ($q) => $q->where('inventory_category_id', $request->integer('inventory_category_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($inner) => $inner->where('name', 'like', $term)->orWhere('code', 'like', $term));
            })
            ->when($request->boolean('low_stock'), fn ($q) => $q->whereColumn('quantity', '<=', 'reorder_level'))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return InventoryItemResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $item = InventoryItem::create($data + $tenant);

        return (new InventoryItemResource($item->load('category')))->response()->setStatusCode(201);
    }

    public function show(InventoryItem $inventoryItem): InventoryItemResource
    {
        return new InventoryItemResource($inventoryItem->load('category'));
    }

    public function update(Request $request, InventoryItem $inventoryItem): InventoryItemResource
    {
        $inventoryItem->update($request->validate($this->rules(false)));

        return new InventoryItemResource($inventoryItem->refresh()->load('category'));
    }

    public function destroy(InventoryItem $inventoryItem): JsonResponse
    {
        $inventoryItem->delete();

        return response()->json(['message' => 'Inventory item removed.']);
    }

    public function movements(Request $request, InventoryItem $inventoryItem): AnonymousResourceCollection
    {
        $movements = $inventoryItem->movements()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('moved_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return InventoryStockMovementResource::collection($movements);
    }

    public function recordMovement(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['purchase', 'issue', 'return', 'adjustment', 'wastage'])],
            'quantity' => ['required', 'numeric'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'moved_on' => ['nullable', 'date'],
        ]);

        $data['moved_on'] = $data['moved_on'] ?? now()->toDateString();

        $movement = $this->inventory->recordMovement($inventoryItem, $data, $request->user()?->id);

        return (new InventoryStockMovementResource($movement->load('item')))->response()->setStatusCode(201);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'inventory_category_id' => ['nullable', 'integer', 'exists:inventory_categories,id'],
            'name' => [$presence, 'string', 'max:255'],
            'code' => [$presence, 'string', 'max:64'],
            'unit' => ['sometimes', 'string', 'max:32'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'numeric'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
