<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeePaymentResource;
use App\Models\FeePayment;
use App\Models\FeeVoucher;
use App\Models\Student;
use App\Services\Accounting\FeeBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FeePaymentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FeeBillingService $billing) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $payments = FeePayment::query()
            ->with(['student', 'voucher'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('fee_voucher_id'), fn ($q) => $q->where('fee_voucher_id', $request->integer('fee_voucher_id')))
            ->when($request->filled('method'), fn ($q) => $q->where('method', $request->string('method')->toString()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('payment_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('payment_date', '<=', $request->date('to')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeePaymentResource::collection($payments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'fee_voucher_id' => [
                'nullable', 'integer',
                Rule::exists('fee_vouchers', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'payment_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $student = Student::query()->findOrFail($data['student_id']);

        $voucher = null;

        if (! empty($data['fee_voucher_id'])) {
            $voucher = FeeVoucher::query()->findOrFail($data['fee_voucher_id']);

            if ($voucher->student_id !== $student->id) {
                throw ValidationException::withMessages([
                    'fee_voucher_id' => ['The voucher does not belong to the selected student.'],
                ]);
            }

            $outstanding = round((float) $voucher->amount - (float) $voucher->paid_amount, 2);

            if ((float) $data['amount'] > $outstanding + 0.005) {
                throw ValidationException::withMessages([
                    'amount' => ["The amount exceeds the voucher balance of {$outstanding}."],
                ]);
            }
        }

        $payment = FeePayment::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'student_id' => $student->id,
            'fee_voucher_id' => $voucher?->id,
            'receipt_no' => $this->billing->nextReceiptNo($tenant['campus_id']),
            'payment_date' => $data['payment_date'],
            'amount' => $data['amount'],
            'method' => $data['method'],
            'reference' => $data['reference'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => PaymentStatus::Draft,
            'created_by' => $request->user()->id,
        ]);

        $payment = $this->billing->recordPayment($payment, $request->user()->id);

        return (new FeePaymentResource($payment->load(['student', 'voucher'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(FeePayment $feePayment): FeePaymentResource
    {
        return new FeePaymentResource($feePayment->load([
            'student', 'voucher.lines.feeHead', 'voucher.feePlan',
        ]));
    }

    public function void(Request $request, FeePayment $feePayment): FeePaymentResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        $payment = $this->billing->voidPayment($feePayment, $request->user()->id, $data['memo'] ?? null);

        return new FeePaymentResource($payment->load(['student', 'voucher']));
    }

    public function apply(Request $request, FeePayment $feePayment): FeePaymentResource
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'fee_voucher_id' => [
                'required', 'integer',
                Rule::exists('fee_vouchers', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
        ]);

        $voucher = FeeVoucher::query()->findOrFail($data['fee_voucher_id']);

        $payment = $this->billing->applyAdvance($feePayment, $voucher, $request->user()->id);

        return new FeePaymentResource($payment->load(['student', 'voucher']));
    }
}
