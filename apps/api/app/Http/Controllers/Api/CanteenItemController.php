<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenItemResource;
use App\Http\Resources\CanteenStockEntryResource;
use App\Models\CanteenItem;
use App\Services\Canteen\CanteenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CanteenItemController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly CanteenService $canteen) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = CanteenItem::query()
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->boolean('low_stock'), fn ($q) => $q->where('track_stock', true)->whereColumn('stock_quantity', '<=', 'reorder_level'))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', '%'.$request->string('search').'%')
                ->orWhere('code', 'like', '%'.$request->string('search').'%')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return CanteenItemResource::collection($items);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $item = CanteenItem::create($data + $tenant);

        return (new CanteenItemResource($item))->response()->setStatusCode(201);
    }

    public function show(CanteenItem $item): CanteenItemResource
    {
        return new CanteenItemResource($item);
    }

    public function update(Request $request, CanteenItem $item): CanteenItemResource
    {
        $item->update($request->validate($this->rules($item->campus_id, $item->id, false)));

        return new CanteenItemResource($item);
    }

    public function destroy(CanteenItem $item): JsonResponse
    {
        $item->delete();

        return response()->json(['message' => 'Canteen item removed.']);
    }

    public function adjustStock(Request $request, CanteenItem $item): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'numeric', 'not_in:0'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $entry = $this->canteen->createStockEntry([
            'canteen_item_id' => $item->id,
            'type' => 'adjustment',
            'quantity' => $data['quantity'],
            'unit_cost' => $data['unit_cost'] ?? null,
            'notes' => $data['notes'] ?? null,
            'entry_date' => now()->toDateString(),
        ], (int) $item->campus_id, (int) $item->institution_id, $request->user()?->id);

        return response()->json(['data' => [
            'item' => new CanteenItemResource($item->refresh()),
            'stock_entry' => new CanteenStockEntryResource($entry->load('item')),
        ]]);
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
                Rule::unique('canteen_items', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'category' => ['nullable', 'string', 'max:64'],
            'unit' => ['sometimes', 'string', 'max:24'],
            'price' => [$presence, 'numeric', 'min:0'],
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'track_stock' => ['sometimes', 'boolean'],
            'stock_quantity' => ['sometimes', 'numeric'],
            'reorder_level' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
        ];
    }
}
