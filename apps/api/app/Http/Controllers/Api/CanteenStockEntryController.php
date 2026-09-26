<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenStockEntryResource;
use App\Models\CanteenStockEntry;
use App\Services\Canteen\CanteenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CanteenStockEntryController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly CanteenService $canteen) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $entries = CanteenStockEntry::query()
            ->with(['item', 'supplier'])
            ->when($request->filled('canteen_item_id'), fn ($q) => $q->where('canteen_item_id', $request->integer('canteen_item_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('entry_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('entry_date', '<=', $request->date('to')))
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CanteenStockEntryResource::collection($entries);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'canteen_item_id' => ['required', 'integer', Rule::exists('canteen_items', 'id')->where('campus_id', $tenant['campus_id'])],
            'supplier_id' => ['nullable', 'integer', Rule::exists('canteen_suppliers', 'id')->where('campus_id', $tenant['campus_id'])],
            'type' => ['sometimes', Rule::in(['purchase', 'adjustment', 'wastage', 'return'])],
            'reference' => ['nullable', 'string', 'max:255'],
            'quantity' => ['required', 'numeric'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'entry_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if (($data['type'] ?? 'purchase') === 'adjustment') {
            throw ValidationException::withMessages([
                'type' => ['Use the item stock adjustment endpoint for corrections.'],
            ]);
        }

        $entry = $this->canteen->createStockEntry(
            $data,
            $tenant['campus_id'],
            $tenant['institution_id'],
            $request->user()?->id,
        );

        return (new CanteenStockEntryResource($entry))->response()->setStatusCode(201);
    }

    public function show(CanteenStockEntry $stockEntry): CanteenStockEntryResource
    {
        return new CanteenStockEntryResource($stockEntry->load(['item', 'supplier']));
    }
}
