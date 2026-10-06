<?php

namespace App\Http\Controllers\Api;

use App\Enums\BillingKind;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeStructureResource;
use App\Models\FeeStructure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FeeStructureController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $structures = FeeStructure::query()
            ->with(['items.feeHead', 'academicYear', 'classRoom'])
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('class_room_id')
            ->paginate($request->integer('per_page', 50));

        return FeeStructureResource::collection($structures);
    }

    public function resolve(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'academic_year_id' => ['required', 'integer'],
            'class_room_id' => ['required', 'integer'],
        ]);

        $structure = FeeStructure::query()
            ->with(['items.feeHead', 'academicYear', 'classRoom'])
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('class_room_id', $data['class_room_id'])
            ->where('is_active', true)
            ->first();

        return response()->json([
            'data' => $structure ? (new FeeStructureResource($structure))->resolve() : null,
            'campus_id' => $tenant['campus_id'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $structure = DB::transaction(function () use ($data, $tenant) {
            $structure = FeeStructure::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'academic_year_id' => $data['academic_year_id'],
                'class_room_id' => $data['class_room_id'],
                'name' => $data['name'],
                'is_active' => $data['is_active'] ?? true,
            ]);

            $this->syncItems($structure, $data['items']);

            return $structure;
        });

        return (new FeeStructureResource($structure->load(['items.feeHead', 'academicYear', 'classRoom'])))
            ->response()->setStatusCode(201);
    }

    public function show(FeeStructure $feeStructure): FeeStructureResource
    {
        return new FeeStructureResource($feeStructure->load(['items.feeHead', 'academicYear', 'classRoom']));
    }

    public function update(Request $request, FeeStructure $feeStructure): FeeStructureResource
    {
        $data = $request->validate($this->rules($feeStructure->campus_id, $feeStructure->id, false));

        DB::transaction(function () use ($feeStructure, $data) {
            $feeStructure->update([
                'academic_year_id' => $data['academic_year_id'] ?? $feeStructure->academic_year_id,
                'class_room_id' => $data['class_room_id'] ?? $feeStructure->class_room_id,
                'name' => $data['name'] ?? $feeStructure->name,
                'is_active' => $data['is_active'] ?? $feeStructure->is_active,
            ]);

            if (array_key_exists('items', $data)) {
                $feeStructure->items()->delete();
                $this->syncItems($feeStructure, $data['items']);
            }
        });

        return new FeeStructureResource($feeStructure->load(['items.feeHead', 'academicYear', 'classRoom']));
    }

    public function destroy(FeeStructure $feeStructure): JsonResponse
    {
        $feeStructure->delete();

        return response()->json(['message' => 'Fee structure archived.']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(FeeStructure $structure, array $items): void
    {
        foreach ($items as $index => $item) {
            $structure->items()->create([
                'fee_head_id' => $item['fee_head_id'] ?? null,
                'name' => $item['name'],
                'billing_kind' => $item['billing_kind'],
                'exam_term' => $item['exam_term'] ?? null,
                'amount' => $item['amount'] ?? 0,
                'is_optional' => $item['is_optional'] ?? false,
                'sort_order' => $item['sort_order'] ?? $index,
                'is_active' => $item['is_active'] ?? true,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'academic_year_id' => [
                $presence, 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'name' => [$presence, 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'items' => [$presence, 'array', 'min:1'],
            'items.*.fee_head_id' => ['nullable', 'integer', Rule::exists('fee_heads', 'id')->where('campus_id', $campusId)],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.billing_kind' => ['required', Rule::in(array_column(BillingKind::cases(), 'value'))],
            'items.*.exam_term' => ['nullable', 'string', Rule::in(['first', 'second', 'third', 'final', 'monthly_test'])],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.is_optional' => ['sometimes', 'boolean'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'items.*.is_active' => ['sometimes', 'boolean'],
        ];
    }
}
