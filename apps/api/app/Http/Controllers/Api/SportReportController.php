<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Services\Sports\SportsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SportReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly SportsService $sports) {}

    public function summary(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $this->sports->summary($tenant['campus_id'], $request->only(['sport_id', 'from', 'to']));

        return response()->json(['data' => $data]);
    }
}
