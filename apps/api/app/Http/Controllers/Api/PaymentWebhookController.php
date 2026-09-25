<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentIntentResource;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    public function handle(Request $request, string $gateway): JsonResponse
    {
        $intent = $this->payments->handleWebhook(
            $gateway,
            $request->getContent(),
            $request->header('X-Payment-Signature'),
        );

        return response()->json([
            'message' => 'Webhook processed.',
            'data' => new PaymentIntentResource($intent->load(['student', 'voucher'])),
        ]);
    }
}
