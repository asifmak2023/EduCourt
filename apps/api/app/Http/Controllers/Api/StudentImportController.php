<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Services\Imports\StudentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentImportController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly StudentImportService $importer) {}

    /**
     * Preview a CSV without writing anything. Reports per-row errors.
     */
    public function preview(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $this->validateUpload($request);

        $result = $this->importer->import(
            $tenant,
            $data['file']->getRealPath(),
            dryRun: true,
        );

        return response()->json([
            'message' => "{$result['valid']} of {$result['rows']} row(s) are valid.",
            ...$result,
        ]);
    }

    /**
     * Import students. Runs a dry run first unless "dry_run" is false.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $this->validateUpload($request);

        $dryRun = $request->boolean('dry_run', false);
        $skipInvalid = $request->boolean('skip_invalid', false);

        $result = $this->importer->import(
            $tenant,
            $data['file']->getRealPath(),
            dryRun: $dryRun,
            skipInvalid: $skipInvalid,
            userId: $request->user()?->id,
        );

        $message = $dryRun
            ? "Dry run: {$result['valid']} of {$result['rows']} row(s) would be imported."
            : "{$result['created']} student(s) imported, {$result['skipped']} row(s) skipped.";

        return response()->json([
            'message' => $message,
            'dry_run' => $dryRun,
            ...$result,
        ], $dryRun ? 200 : 201);
    }

    /**
     * Download a CSV template with the expected columns and one example row.
     */
    public function template(): StreamedResponse
    {
        $headers = [
            'first_name', 'last_name', 'gender', 'admission_no', 'date_of_birth',
            'blood_group', 'nationality', 'religion', 'category', 'national_id',
            'email', 'phone', 'address', 'city', 'previous_school', 'admission_date',
            'status', 'guardian_name', 'guardian_relationship', 'guardian_email',
            'guardian_phone', 'guardian_is_primary', 'academic_year', 'class', 'section',
        ];

        $example = [
            'Ali', 'Raza', 'male', 'ADM-00001', '2015-04-12',
            'O+', 'Pakistani', 'Islam', 'General', '35201-1234567-1',
            'ali.raza@example.test', '+92-300-0000001', '12 Model Town', 'Lahore',
            'City Public School', '2026-04-05', 'active', 'Imran Raza', 'father',
            'imran@example.test', '+92-300-0000002', 'yes', '2026-2027', 'Class 1', 'A',
        ];

        return response()->streamDownload(function () use ($headers, $example): void {
            $handle = fopen('php://output', 'wb');
            fputcsv($handle, $headers);
            fputcsv($handle, $example);
            fclose($handle);
        }, 'student-import-template.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{file: UploadedFile}
     */
    private function validateUpload(Request $request): array
    {
        return $request->validate([
            'file' => [
                'required', 'file', 'max:10240',
                'mimes:csv,txt',
            ],
        ]);
    }
}
