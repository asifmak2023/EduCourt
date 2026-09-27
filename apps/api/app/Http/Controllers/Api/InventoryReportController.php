<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryReportController extends Controller
{
    public function __construct(private readonly InventoryService $inventory) {}

    public function summary(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->inventory->summary()]);
    }
}
