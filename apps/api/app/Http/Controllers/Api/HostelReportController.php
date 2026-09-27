<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\Hostel;
use App\Services\Hostel\HostelService;
use Illuminate\Http\JsonResponse;

class HostelReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly HostelService $hostels) {}

    public function summary(Hostel $hostel): JsonResponse
    {
        $this->academicTenantAttributes();

        return response()->json(['data' => $this->hostels->summary($hostel)]);
    }
}
