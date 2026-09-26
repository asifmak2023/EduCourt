<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use Illuminate\Http\JsonResponse;

/**
 * Cross-institution analytics available to the Super User (product owner).
 */
class PlatformReportController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function overview(): JsonResponse
    {
        return response()->json(['data' => $this->reports->platformOverview()]);
    }
}
