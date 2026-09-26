<?php

namespace App\Http\Controllers\Api;

use App\Enums\PayrollAdjustmentType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollAdjustmentResource;
use App\Models\PayrollAdjustment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PayrollAdjustmentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $adjustments = PayrollAdjustment::query()
            ->with('staffMember')
            ->when($request->filled('staff_member_id'), fn ($q) => $q->where('staff_member_id', $request->integer('staff_member_id')))
            ->when($request->filled('period'), fn ($q) => $q->where('period', $request->string('period')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->has('is_applied'), fn ($q) => $q->where('is_applied', $request->boolean('is_applied')))
            ->orderByDesc('period')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return PayrollAdjustmentResource::collection($adjustments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $adjustment = PayrollAdjustment::create($data + $tenant + [
            'created_by' => $request->user()?->id,
        ]);

        return (new PayrollAdjustmentResource($adjustment->load('staffMember')))
            ->response()->setStatusCode(201);
    }

    public function show(PayrollAdjustment $payrollAdjustment): PayrollAdjustmentResource
    {
        return new PayrollAdjustmentResource($payrollAdjustment->load('staffMember'));
    }

    public function update(Request $request, PayrollAdjustment $payrollAdjustment): PayrollAdjustmentResource
    {
        if ($payrollAdjustment->is_applied) {
            abort(409, 'Adjustments already applied to a payroll run cannot be edited.');
        }

        $data = $request->validate($this->rules($payrollAdjustment->campus_id, false));

        $payrollAdjustment->update($data);

        return new PayrollAdjustmentResource($payrollAdjustment->load('staffMember'));
    }

    public function destroy(PayrollAdjustment $payrollAdjustment): JsonResponse
    {
        if ($payrollAdjustment->is_applied) {
            abort(409, 'Adjustments already applied to a payroll run cannot be removed.');
        }

        $payrollAdjustment->delete();

        return response()->json(['message' => 'Payroll adjustment removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'staff_member_id' => [
                $presence, 'integer',
                Rule::exists('staff_members', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'type' => [$presence, Rule::enum(PayrollAdjustmentType::class)],
            'amount' => [$presence, 'numeric', 'min:0'],
            'period' => [$presence, 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
