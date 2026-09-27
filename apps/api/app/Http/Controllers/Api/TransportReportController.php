<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Services\Transport\TransportService;
use Illuminate\Http\JsonResponse;

class TransportReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TransportService $transport) {}

    public function summary(): JsonResponse
    {
        $this->academicTenantAttributes();

        return response()->json(['data' => $this->transport->summary()]);
    }
}
