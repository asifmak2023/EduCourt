<?php

namespace App\Http\Controllers\Api;

use App\Enums\LateFeeType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeePlanResource;
use App\Models\FeePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FeePlanController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $plans = FeePlan::query()
            ->with(['classRoom', 'academicYear', 'items.feeHead', 'installments'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeePlanResource::collection($plans);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $this->assertUniqueName(
            $tenant['campus_id'],
            $data['academic_year_id'],
            $data['class_room_id'],
            $data['name'],
        );

        $plan = DB::transaction(function () use ($data, $tenant) {
            $plan = FeePlan::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'academic_year_id' => $data['academic_year_id'],
                'class_room_id' => $data['class_room_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'late_fee_type' => $data['late_fee_type'] ?? LateFeeType::None->value,
                'late_fee_amount' => $data['late_fee_amount'] ?? 0,
                'late_fee_grace_days' => $data['late_fee_grace_days'] ?? 0,
            ]);

            $this->syncItems($plan, $data['items']);
            $this->syncInstallments($plan, $data['installments']);

            return $plan;
        });

        return (new FeePlanResource($plan->load($this->relations())))
            ->response()->setStatusCode(201);
    }

    public function show(FeePlan $feePlan): FeePlanResource
    {
        return new FeePlanResource($feePlan->load($this->relations()));
    }

    public function update(Request $request, FeePlan $feePlan): FeePlanResource
    {
        $data = $request->validate($this->rules($feePlan->campus_id, false));
        $this->assertUniqueName(
            $feePlan->campus_id,
            $data['academic_year_id'] ?? $feePlan->academic_year_id,
            $data['class_room_id'] ?? $feePlan->class_room_id,
            $data['name'] ?? $feePlan->name,
            $feePlan->id,
        );

        DB::transaction(function () use ($feePlan, $data) {
            $feePlan->update(array_filter([
                'academic_year_id' => $data['academic_year_id'] ?? null,
                'class_room_id' => $data['class_room_id'] ?? null,
                'name' => $data['name'] ?? null,
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? null,
                'late_fee_type' => $data['late_fee_type'] ?? null,
                'late_fee_amount' => $data['late_fee_amount'] ?? null,
                'late_fee_grace_days' => $data['late_fee_grace_days'] ?? null,
            ], fn ($value) => $value !== null));

            if (array_key_exists('items', $data)) {
                $this->syncItems($feePlan, $data['items']);
            }

            if (array_key_exists('installments', $data)) {
                $this->syncInstallments($feePlan, $data['installments']);
            }
        });

        return new FeePlanResource($feePlan->refresh()->load($this->relations()));
    }

    public function destroy(FeePlan $feePlan): JsonResponse
    {
        $feePlan->delete();

        return response()->json(['message' => 'Fee plan archived.']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(FeePlan $plan, array $items): void
    {
        $plan->items()->delete();

        foreach (array_values($items) as $index => $item) {
            $plan->items()->create([
                'fee_head_id' => $item['fee_head_id'],
                'amount' => $item['amount'],
                'is_optional' => $item['is_optional'] ?? false,
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $installments
     */
    private function syncInstallments(FeePlan $plan, array $installments): void
    {
        $total = collect($installments)->sum(fn ($installment) => (float) $installment['percentage']);

        if (abs($total - 100) > 0.01) {
            throw ValidationException::withMessages([
                'installments' => ["Installment percentages must total 100 (got {$total})."],
            ]);
        }

        $plan->installments()->delete();

        foreach (array_values($installments) as $index => $installment) {
            $plan->installments()->create([
                'sequence' => $index + 1,
                'label' => $installment['label'],
                'due_date' => $installment['due_date'],
                'percentage' => $installment['percentage'],
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['classRoom', 'academicYear', 'items.feeHead', 'installments'];
    }

    private function assertUniqueName(int $campusId, int $academicYearId, int $classRoomId, string $name, ?int $ignoreId = null): void
    {
        $exists = FeePlan::query()
            ->where('campus_id', $campusId)
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->where('name', $name)
            ->when($ignoreId !== null, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'name' => ['A fee plan with this name already exists for the class and academic year.'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
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
            'name' => [$presence, 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'late_fee_type' => ['sometimes', Rule::enum(LateFeeType::class)],
            'late_fee_amount' => ['sometimes', 'numeric', 'min:0'],
            'late_fee_grace_days' => ['sometimes', 'integer', 'min:0'],
            'items' => [$presence, 'array', 'min:1'],
            'items.*.fee_head_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('fee_heads', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.is_optional' => ['sometimes', 'boolean'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'installments' => [$presence, 'array', 'min:1'],
            'installments.*.label' => ['required', 'string', 'max:64'],
            'installments.*.due_date' => ['required', 'date'],
            'installments.*.percentage' => ['required', 'numeric', 'gt:0', 'max:100'],
        ];
    }
}
