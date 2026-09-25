<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;

interface PaymentGateway
{
    /**
     * Create a hosted checkout for the intent and return the checkout URL.
     */
    public function createCheckout(PaymentIntent $intent): string;
}
