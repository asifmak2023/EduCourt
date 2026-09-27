<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TransportRouteResource;
use App\Http\Resources\TransportRouteStopResource;
use App\Models\TransportRoute;
use App\Models\TransportRouteStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TransportRouteController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $routes = TransportRoute::query()
            ->with('vehicle')
            ->withCount(['stops', 'allocations'])
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return TransportRouteResource::collection($routes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $route = TransportRoute::create($data + $tenant);

        return (new TransportRouteResource($route->load('vehicle')))->response()->setStatusCode(201);
    }

    public function show(TransportRoute $route): TransportRouteResource
    {
        return new TransportRouteResource($route->load(['vehicle', 'stops'])->loadCount('allocations'));
    }

    public function update(Request $request, TransportRoute $route): TransportRouteResource
    {
        $route->update($request->validate($this->rules(false)));

        return new TransportRouteResource($route->refresh()->load('vehicle')->loadCount(['stops', 'allocations']));
    }

    public function destroy(TransportRoute $route): JsonResponse
    {
        $route->delete();

        return response()->json(['message' => 'Transport route removed.']);
    }

    public function stops(TransportRoute $route): AnonymousResourceCollection
    {
        return TransportRouteStopResource::collection(
            $route->stops()->orderBy('sequence')->get()
        );
    }

    public function addStop(Request $request, TransportRoute $route): JsonResponse
    {
        $data = $request->validate($this->stopRules());

        $stop = $route->stops()->create($data + [
            'institution_id' => $route->institution_id,
            'campus_id' => $route->campus_id,
        ]);

        return (new TransportRouteStopResource($stop))->response()->setStatusCode(201);
    }

    public function updateStop(Request $request, TransportRouteStop $stop): TransportRouteStopResource
    {
        $stop->update($request->validate($this->stopRules(false)));

        return new TransportRouteStopResource($stop->refresh());
    }

    public function destroyStop(TransportRouteStop $stop): JsonResponse
    {
        $stop->delete();

        return response()->json(['message' => 'Route stop removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [$presence, 'string', 'max:32'],
            'start_point' => ['nullable', 'string', 'max:255'],
            'end_point' => ['nullable', 'string', 'max:255'],
            'distance_km' => ['sometimes', 'numeric', 'min:0'],
            'fare' => ['sometimes', 'numeric', 'min:0'],
            'vehicle_id' => ['nullable', 'integer', Rule::exists('vehicles', 'id')],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function stopRules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'sequence' => ['sometimes', 'integer', 'min:1'],
            'pickup_time' => ['nullable', 'date_format:H:i'],
            'drop_time' => ['nullable', 'date_format:H:i'],
            'fare' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
