<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeVoucherResource;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Services\Accounting\FeeBillingService;
use App\Services\Scholarships\ScholarshipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FeeVoucherController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(
        private readonly FeeBillingService $billing,
        private readonly ScholarshipService $scholarships,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $vouchers = FeeVoucher::query()
            ->with(['student', 'lines.feeHead', 'payments'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('fee_plan_id'), fn ($q) => $q->where('fee_plan_id', $request->integer('fee_plan_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('class_room_id'), fn ($q) => $q->whereHas('student.enrollments', fn ($e) => $e
                ->where('class_room_id', $request->integer('class_room_id'))
                ->when($request->filled('academic_year_id'), fn ($inner) => $inner->where('academic_year_id', $request->integer('academic_year_id')))))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeVoucherResource::collection($vouchers);
    }

    public function generate(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'academic_year_id' => [
                'required', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'fee_plan_id' => [
                'required', 'integer',
                Rule::exists('fee_plans', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'discounts' => ['sometimes', 'array'],
            'discounts.*' => ['numeric', 'min:0'],
            'apply_scholarships' => ['sometimes', 'boolean'],
        ]);

        $plan = FeePlan::query()->findOrFail($data['fee_plan_id']);

        if ($plan->academic_year_id !== $data['academic_year_id'] || $plan->class_room_id !== $data['class_room_id']) {
            throw ValidationException::withMessages([
                'fee_plan_id' => ['The fee plan does not belong to the selected academic year and class.'],
            ]);
        }

        $discounts = $data['discounts'] ?? [];

        if ($request->boolean('apply_scholarships', true)) {
            $annualGross = (float) $plan->items()->where('is_optional', false)->sum('amount');

            $discounts = $this->scholarships->applyToDiscounts(
                $plan->academic_year_id,
                $plan->class_room_id,
                $annualGross,
                $discounts,
            );
        }

        $result = $this->billing->generateForClass($plan, $discounts, $request->user()->id);

        $vouchers = FeeVoucher::query()
            ->with(['student', 'lines.feeHead', 'payments'])
            ->where('fee_plan_id', $plan->id)
            ->where('academic_year_id', $plan->academic_year_id)
            ->whereHas('student.enrollments', fn ($e) => $e
                ->where('class_room_id', $plan->class_room_id)
                ->where('academic_year_id', $plan->academic_year_id))
            ->orderBy('student_id')
            ->orderBy('sequence')
            ->get();

        return response()->json([
            'message' => "Generated {$result['created']} voucher(s), skipped {$result['skipped']}.",
            'created' => $result['created'],
            'skipped' => $result['skipped'],
            'data' => FeeVoucherResource::collection($vouchers)->resolve(),
        ], 201);
    }

    public function show(FeeVoucher $feeVoucher): FeeVoucherResource
    {
        return new FeeVoucherResource($feeVoucher->load([
            'student', 'lines.feeHead', 'payments', 'feePlan.classRoom', 'feePlan.academicYear',
        ]));
    }

    public function void(Request $request, FeeVoucher $feeVoucher): FeeVoucherResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        $voucher = $this->billing->voidVoucher($feeVoucher, $request->user()->id, $data['memo'] ?? null);

        return new FeeVoucherResource($voucher->load(['student', 'lines.feeHead']));
    }

    public function applyLateFee(Request $request, FeeVoucher $feeVoucher): FeeVoucherResource
    {
        $voucher = $this->billing->applyLateFee($feeVoucher, $request->user()->id);

        return new FeeVoucherResource($voucher->load(['student', 'lines.feeHead']));
    }
}
