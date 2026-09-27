<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Models\Lab;
use App\Services\Lab\LabService;
use Illuminate\Http\JsonResponse;

class LabReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly LabService $labs) {}

    public function summary(Lab $lab): JsonResponse
    {
        $this->academicTenantAttributes();

        return response()->json(['data' => $this->labs->summary($lab)]);
    }
}
