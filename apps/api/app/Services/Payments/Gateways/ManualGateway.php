<?php

namespace App\Services\Payments\Gateways;

use App\Models\PaymentIntent;
use App\Services\Payments\PaymentGateway;

/**
 * Development/manual gateway: returns a static checkout URL that a provider
 * would normally return. Paid/failed transitions arrive through the webhook.
 */
class ManualGateway implements PaymentGateway
{
    public function createCheckout(PaymentIntent $intent): string
    {
        $base = (string) config('payments.gateways.manual.checkout_url', 'https://payments.example.test/checkout');

        return $base.(str_contains($base, '?') ? '&' : '?').http_build_query([
            'reference' => $intent->reference,
            'amount' => $intent->amount,
            'currency' => $intent->currency,
        ]);
    }
}
