<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeRefundResource;
use App\Models\FeePayment;
use App\Models\FeeRefund;
use App\Services\Accounting\FeeBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class FeeRefundController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FeeBillingService $billing) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $refunds = FeeRefund::query()
            ->with(['student', 'payment'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('fee_payment_id'), fn ($q) => $q->where('fee_payment_id', $request->integer('fee_payment_id')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('refund_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('refund_date', '<=', $request->date('to')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeRefundResource::collection($refunds);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'fee_payment_id' => [
                'required', 'integer',
                Rule::exists('fee_payments', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'refund_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $payment = FeePayment::query()->findOrFail($data['fee_payment_id']);

        $refund = FeeRefund::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'student_id' => $payment->student_id,
            'fee_payment_id' => $payment->id,
            'receipt_no' => $this->billing->nextRefundNo($tenant['campus_id']),
            'refund_date' => $data['refund_date'],
            'amount' => $data['amount'],
            'method' => $data['method'],
            'reason' => $data['reason'] ?? null,
            'status' => PaymentStatus::Draft,
            'created_by' => $request->user()->id,
        ]);

        $refund = $this->billing->recordRefund($refund, $request->user()->id);

        return (new FeeRefundResource($refund->load(['student', 'payment'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(FeeRefund $feeRefund): FeeRefundResource
    {
        return new FeeRefundResource($feeRefund->load(['student', 'payment.voucher']));
    }
}
