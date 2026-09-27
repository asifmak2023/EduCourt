<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Services\It\ItService;
use Illuminate\Http\JsonResponse;

class ItReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ItService $it) {}

    public function summary(): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        return response()->json(['data' => $this->it->summary($tenant['campus_id'])]);
    }
}
