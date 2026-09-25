<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentIntentResource;
use App\Models\FeeVoucher;
use App\Models\PaymentIntent;
use App\Models\Student;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class OnlinePaymentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly PaymentService $payments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $intents = PaymentIntent::query()
            ->with(['student', 'voucher'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('fee_voucher_id'), fn ($q) => $q->where('fee_voucher_id', $request->integer('fee_voucher_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return PaymentIntentResource::collection($intents);
    }

    public function initiate(Request $request): JsonResponse
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
            'amount' => ['required', 'numeric', 'gt:0'],
            'gateway' => ['nullable', 'string', 'max:50'],
        ]);

        $student = Student::query()->findOrFail($data['student_id']);

        $voucher = isset($data['fee_voucher_id'])
            ? FeeVoucher::query()->findOrFail($data['fee_voucher_id'])
            : null;

        $intent = $this->payments->initiate(
            $tenant,
            $student,
            $voucher,
            (float) $data['amount'],
            $data['gateway'] ?? null,
            $request->user()->id,
        );

        return (new PaymentIntentResource($intent->load(['student', 'voucher'])))
            ->response()->setStatusCode(201);
    }

    public function show(PaymentIntent $paymentIntent): PaymentIntentResource
    {
        return new PaymentIntentResource($paymentIntent->load(['student', 'voucher', 'payment']));
    }

    public function cancel(PaymentIntent $paymentIntent): PaymentIntentResource
    {
        $intent = $this->payments->cancel($paymentIntent);

        return new PaymentIntentResource($intent->load(['student', 'voucher']));
    }

    public function status(Request $request): JsonResponse
    {
        $reference = (string) $request->string('reference');

        $intent = PaymentIntent::query()->where('reference', $reference)->firstOrFail();

        return response()->json([
            'data' => [
                'reference' => $intent->reference,
                'status' => $intent->status?->value,
                'status_label' => $intent->status?->label(),
                'paid_at' => $intent->paid_at?->toIso8601String(),
            ],
        ]);
    }
}
