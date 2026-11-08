<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WhatsApp\WhatsAppWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Public Meta WhatsApp webhook endpoint.
 *
 * GET is the subscription handshake. POST is authenticated by signature; it is
 * deliberately outside the tenant middleware because Meta carries no session.
 */
class WhatsAppWebhookController extends Controller
{
    public function __construct(private readonly WhatsAppWebhookService $webhooks) {}

    public function verify(Request $request, string $appKey): Response
    {
        $challenge = $this->webhooks->verify($request, $appKey);

        return response($challenge, 200)->header('Content-Type', 'text/plain');
    }

    public function handle(Request $request, string $appKey): JsonResponse
    {
        $result = $this->webhooks->handle($request, $appKey);

        return response()->json([
            'message' => 'received',
            'processed' => $result['processed'],
            'unmatched' => $result['unmatched'],
        ]);
    }
}
