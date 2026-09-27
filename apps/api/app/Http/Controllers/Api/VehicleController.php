<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $vehicles = Vehicle::query()
            ->with('driver')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), fn ($q) => $q->where('registration_no', 'like', '%'.$request->string('search').'%'))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return VehicleResource::collection($vehicles);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $vehicle = Vehicle::create($data + $tenant);

        return (new VehicleResource($vehicle->load('driver')))->response()->setStatusCode(201);
    }

    public function show(Vehicle $vehicle): VehicleResource
    {
        return new VehicleResource($vehicle->load('driver'));
    }

    public function update(Request $request, Vehicle $vehicle): VehicleResource
    {
        $vehicle->update($request->validate($this->rules(false)));

        return new VehicleResource($vehicle->refresh()->load('driver'));
    }

    public function destroy(Vehicle $vehicle): JsonResponse
    {
        $vehicle->delete();

        return response()->json(['message' => 'Vehicle removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'registration_no' => [$presence, 'string', 'max:64'],
            'type' => ['sometimes', Rule::in(['bus', 'van', 'coaster', 'car'])],
            'capacity' => ['sometimes', 'integer', 'min:0'],
            'model' => ['nullable', 'string', 'max:255'],
            'driver_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'driver_phone' => ['nullable', 'string', 'max:32'],
            'conductor_name' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
