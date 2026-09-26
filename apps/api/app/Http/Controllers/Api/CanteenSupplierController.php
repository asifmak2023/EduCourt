<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\CanteenSupplierResource;
use App\Models\CanteenSupplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CanteenSupplierController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $suppliers = CanteenSupplier::query()
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return CanteenSupplierResource::collection($suppliers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $supplier = CanteenSupplier::create($data + $this->academicTenantAttributes());

        return (new CanteenSupplierResource($supplier))->response()->setStatusCode(201);
    }

    public function show(CanteenSupplier $supplier): CanteenSupplierResource
    {
        return new CanteenSupplierResource($supplier);
    }

    public function update(Request $request, CanteenSupplier $supplier): CanteenSupplierResource
    {
        $supplier->update($request->validate($this->rules()));

        return new CanteenSupplierResource($supplier);
    }

    public function destroy(CanteenSupplier $supplier): JsonResponse
    {
        $supplier->delete();

        return response()->json(['message' => 'Canteen supplier removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
