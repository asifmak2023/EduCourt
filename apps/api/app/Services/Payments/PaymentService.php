<?php

namespace App\Services\Payments;

use App\Enums\PaymentIntentStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\FeePayment;
use App\Models\FeeVoucher;
use App\Models\PaymentIntent;
use App\Models\Student;
use App\Services\Accounting\FeeBillingService;
use App\Services\Payments\Gateways\ManualGateway;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        private readonly FeeBillingService $billing,
        private readonly TenantContext $context,
    ) {}

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    public function initiate(
        array $tenant,
        Student $student,
        ?FeeVoucher $voucher,
        float $amount,
        ?string $gateway,
        ?int $userId,
    ): PaymentIntent {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The amount must be greater than zero.']]);
        }

        if ($voucher !== null) {
            if ($voucher->student_id !== $student->id) {
                throw ValidationException::withMessages([
                    'fee_voucher_id' => ['The voucher does not belong to the selected student.'],
                ]);
            }

            $outstanding = round((float) $voucher->amount - (float) $voucher->paid_amount, 2);

            if ($amount > $outstanding + 0.005) {
                throw ValidationException::withMessages([
                    'amount' => ["The amount exceeds the voucher balance of {$outstanding}."],
                ]);
            }
        }

        $gatewayName = $this->resolveGatewayName($gateway);

        $intent = PaymentIntent::create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'student_id' => $student->id,
            'fee_voucher_id' => $voucher?->id,
            'gateway' => $gatewayName,
            'reference' => $this->nextReference($tenant['campus_id']),
            'amount' => $amount,
            'currency' => (string) config('payments.currency', 'PKR'),
            'status' => PaymentIntentStatus::Pending,
            'created_by' => $userId,
        ]);

        $checkoutUrl = $this->gateway($gatewayName)->createCheckout($intent);

        $intent->forceFill(['checkout_url' => $checkoutUrl])->save();

        return $intent;
    }

    /**
     * Apply a gateway webhook to its intent, idempotently.
     */
    public function handleWebhook(string $gateway, string $rawBody, ?string $signature): PaymentIntent
    {
        $this->verifySignature($rawBody, $signature);

        /** @var array<string, mixed> $payload */
        $payload = json_decode($rawBody, true) ?? [];

        $reference = $payload['reference'] ?? null;

        if (! is_string($reference) || $reference === '') {
            throw ValidationException::withMessages(['reference' => ['The webhook has no payment reference.']]);
        }

        $intent = PaymentIntent::withoutGlobalScopes()
            ->where('gateway', $gateway)
            ->where('reference', $reference)
            ->first();

        if ($intent === null) {
            abort(404, 'Unknown payment reference.');
        }

        if ($intent->status === PaymentIntentStatus::Paid) {
            return $intent;
        }

        $status = strtolower((string) ($payload['status'] ?? ''));

        if ($status === 'failed') {
            $intent->forceFill([
                'status' => PaymentIntentStatus::Failed,
                'gateway_payload' => $payload,
            ])->save();

            return $intent;
        }

        if (! in_array($status, ['paid', 'succeeded', 'success'], true)) {
            return $intent;
        }

        if (round((float) ($payload['amount'] ?? 0), 2) !== round((float) $intent->amount, 2)) {
            throw ValidationException::withMessages(['amount' => ['The webhook amount does not match the intent.']]);
        }

        $this->confirm($intent, $payload);

        return $intent->refresh();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function confirm(PaymentIntent $intent, array $payload): void
    {
        $this->context->set($intent->institution_id, $intent->campus_id);

        try {
            DB::transaction(function () use ($intent, $payload) {
                $payment = FeePayment::create([
                    'institution_id' => $intent->institution_id,
                    'campus_id' => $intent->campus_id,
                    'student_id' => $intent->student_id,
                    'fee_voucher_id' => $intent->fee_voucher_id,
                    'receipt_no' => $this->billing->nextReceiptNo($intent->campus_id),
                    'payment_date' => now()->toDateString(),
                    'amount' => $intent->amount,
                    'method' => PaymentMethod::Online,
                    'reference' => $intent->reference,
                    'status' => PaymentStatus::Draft,
                ]);

                $payment = $this->billing->recordPayment($payment, null);

                $intent->forceFill([
                    'status' => PaymentIntentStatus::Paid,
                    'paid_at' => now(),
                    'fee_payment_id' => $payment->id,
                    'gateway_payload' => $payload,
                ])->save();
            });
        } finally {
            $this->context->clear();
        }
    }

    public function cancel(PaymentIntent $intent): PaymentIntent
    {
        if ($intent->status === PaymentIntentStatus::Paid) {
            throw ValidationException::withMessages(['status' => ['A paid intent cannot be cancelled.']]);
        }

        $intent->forceFill(['status' => PaymentIntentStatus::Cancelled])->save();

        return $intent;
    }

    private function verifySignature(string $rawBody, ?string $signature): void
    {
        $secret = (string) config('payments.webhook_secret');

        if ($secret === '') {
            abort(503, 'Payment webhooks are not configured.');
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);

        if ($signature === null || ! hash_equals($expected, $signature)) {
            abort(401, 'Invalid payment signature.');
        }
    }

    private function resolveGatewayName(?string $gateway): string
    {
        $name = $gateway ?: (string) config('payments.default', 'manual');

        if (! array_key_exists($name, config('payments.gateways', []))) {
            throw ValidationException::withMessages(['gateway' => ["Unknown payment gateway [{$name}]."]]);
        }

        return $name;
    }

    private function gateway(string $name): PaymentGateway
    {
        return match ($name) {
            'manual' => new ManualGateway,
            default => throw ValidationException::withMessages(['gateway' => ["Unsupported payment gateway [{$name}]."]]),
        };
    }

    private function nextReference(int $campusId): string
    {
        $sequence = PaymentIntent::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $reference = sprintf('PAY-%06d', $sequence);
            $sequence++;
        } while (PaymentIntent::withTrashed()->where('campus_id', $campusId)->where('reference', $reference)->exists());

        return $reference;
    }
}
