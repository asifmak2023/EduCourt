<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LabEquipmentResource;
use App\Models\Lab;
use App\Models\LabEquipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class LabEquipmentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request, Lab $lab): AnonymousResourceCollection
    {
        $equipment = LabEquipment::query()
            ->where('lab_id', $lab->id)
            ->when($request->filled('condition'), fn ($q) => $q->where('condition', $request->string('condition')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return LabEquipmentResource::collection($equipment);
    }

    public function store(Request $request, Lab $lab): JsonResponse
    {
        $data = $request->validate($this->rules());

        $equipment = $lab->equipment()->create($data + [
            'institution_id' => $lab->institution_id,
            'campus_id' => $lab->campus_id,
        ]);

        return (new LabEquipmentResource($equipment))->response()->setStatusCode(201);
    }

    public function show(LabEquipment $equipment): LabEquipmentResource
    {
        return new LabEquipmentResource($equipment);
    }

    public function update(Request $request, LabEquipment $equipment): LabEquipmentResource
    {
        $equipment->update($request->validate($this->rules(false)));

        return new LabEquipmentResource($equipment->refresh());
    }

    public function destroy(LabEquipment $equipment): JsonResponse
    {
        $equipment->delete();

        return response()->json(['message' => 'Lab equipment removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:64'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'condition' => ['sometimes', Rule::in(['working', 'under_repair', 'damaged', 'retired'])],
            'purchased_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
