<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SportEquipmentMovementResource;
use App\Http\Resources\SportEquipmentResource;
use App\Models\SportEquipment;
use App\Services\Sports\SportsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SportEquipmentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly SportsService $sports) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $equipment = SportEquipment::query()
            ->with('sport')
            ->when($request->filled('sport_id'), fn ($q) => $q->where('sport_id', $request->integer('sport_id')))
            ->when($request->filled('condition'), fn ($q) => $q->where('condition', $request->string('condition')))
            ->when($request->boolean('out_of_stock'), fn ($q) => $q->where('available_quantity', '<=', 0))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return SportEquipmentResource::collection($equipment);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $data['available_quantity'] = $data['available_quantity'] ?? $data['quantity'] ?? 0;

        $equipment = SportEquipment::create($data + $tenant + [
            'condition' => $data['condition'] ?? 'good',
            'is_active' => $data['is_active'] ?? true,
        ]);

        return (new SportEquipmentResource($equipment->load('sport')))->response()->setStatusCode(201);
    }

    public function show(SportEquipment $equipment): SportEquipmentResource
    {
        return new SportEquipmentResource($equipment->load('sport'));
    }

    public function update(Request $request, SportEquipment $equipment): SportEquipmentResource
    {
        $equipment->update($request->validate($this->rules($equipment->campus_id, $equipment->id, false, false)));

        return new SportEquipmentResource($equipment->load('sport'));
    }

    public function destroy(SportEquipment $equipment): JsonResponse
    {
        $equipment->delete();

        return response()->json(['message' => 'Equipment removed.']);
    }

    public function movements(Request $request, SportEquipment $equipment): AnonymousResourceCollection
    {
        $movements = $equipment->movements()
            ->with('issuedTo')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return SportEquipmentMovementResource::collection($movements);
    }

    public function recordMovement(Request $request, SportEquipment $equipment): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['purchase', 'issue', 'return', 'adjustment', 'damage'])],
            'quantity' => ['required', 'numeric'],
            'issued_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'movement_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $movement = $this->sports->recordMovement($equipment, $data, $request->user()?->id);

        return (new SportEquipmentMovementResource($movement->load('issuedTo')))->response()->setStatusCode(201);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true, bool $withStock = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        $rules = [
            'sport_id' => ['nullable', 'integer', Rule::exists('sports', 'id')->where('campus_id', $campusId)],
            'name' => [$presence, 'string', 'max:255'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('sport_equipment', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'unit' => ['nullable', 'string', 'max:24'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'condition' => ['sometimes', Rule::in(['good', 'fair', 'damaged'])],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];

        if ($withStock) {
            $rules['quantity'] = ['nullable', 'numeric', 'min:0'];
            $rules['available_quantity'] = ['nullable', 'numeric', 'min:0', 'lte:quantity'];
        }

        return $rules;
    }
}
