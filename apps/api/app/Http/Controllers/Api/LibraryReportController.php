<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Services\Library\LibraryService;
use Illuminate\Http\JsonResponse;

class LibraryReportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly LibraryService $library) {}

    public function summary(): JsonResponse
    {
        $this->academicTenantAttributes();

        return response()->json(['data' => $this->library->summary()]);
    }
}
