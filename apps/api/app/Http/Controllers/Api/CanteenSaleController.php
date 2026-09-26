<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenSaleResource;
use App\Models\CanteenSale;
use App\Services\Canteen\CanteenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CanteenSaleController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly CanteenService $canteen) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $sales = CanteenSale::query()
            ->with(['student', 'items'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('payment_method'), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('sold_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('sold_on', '<=', $request->date('to')))
            ->orderByDesc('sold_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return CanteenSaleResource::collection($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['cash', 'wallet', 'credit'])],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'sold_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.canteen_item_id' => ['required', 'integer', Rule::exists('canteen_items', 'id')->where('campus_id', $tenant['campus_id'])],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $sale = $this->canteen->createSale(
            $data,
            $tenant['campus_id'],
            $tenant['institution_id'],
            $request->user()?->id,
        );

        return (new CanteenSaleResource($sale->load(['student', 'items'])))->response()->setStatusCode(201);
    }

    public function show(CanteenSale $sale): CanteenSaleResource
    {
        return new CanteenSaleResource($sale->load(['student', 'items']));
    }

    public function void(Request $request, CanteenSale $sale): CanteenSaleResource
    {
        $data = $request->validate(['memo' => ['nullable', 'string']]);

        $sale = $this->canteen->voidSale($sale, $request->user()?->id, $data['memo'] ?? null);

        return new CanteenSaleResource($sale->load(['student', 'items']));
    }
}
