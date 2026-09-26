<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentCertificateResource;
use App\Models\StudentCertificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentCertificateController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $certificates = StudentCertificate::query()
            ->with('student')
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return StudentCertificateResource::collection($certificates);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $certificate = StudentCertificate::create($data + $tenant + [
            'status' => $data['status'] ?? 'pending',
        ]);

        return (new StudentCertificateResource($certificate->load('student')))->response()->setStatusCode(201);
    }

    public function show(StudentCertificate $certificate): StudentCertificateResource
    {
        return new StudentCertificateResource($certificate->load('student'));
    }

    public function update(Request $request, StudentCertificate $certificate): StudentCertificateResource
    {
        $certificate->update($request->validate($this->rules($certificate->campus_id, false)));

        return new StudentCertificateResource($certificate->load('student'));
    }

    public function issue(Request $request, StudentCertificate $certificate): StudentCertificateResource
    {
        $data = $request->validate([
            'serial_no' => ['nullable', 'string', 'max:64'],
            'issued_on' => ['nullable', 'date'],
        ]);

        $certificate->forceFill([
            'serial_no' => $data['serial_no'] ?? $certificate->serial_no ?? $this->nextSerial($certificate),
            'issued_on' => $data['issued_on'] ?? now()->toDateString(),
            'status' => 'issued',
            'issued_by' => $request->user()?->id,
        ])->save();

        return new StudentCertificateResource($certificate->refresh()->load('student'));
    }

    public function destroy(StudentCertificate $certificate): JsonResponse
    {
        $certificate->delete();

        return response()->json(['message' => 'Certificate removed.']);
    }

    private function nextSerial(StudentCertificate $certificate): string
    {
        $sequence = StudentCertificate::withTrashed()->where('campus_id', $certificate->campus_id)->count() + 1;

        return sprintf('CERT-%06d', $sequence);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [$presence, 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'type' => [$presence, 'string', 'max:64'],
            'title' => [$presence, 'string', 'max:255'],
            'serial_no' => ['nullable', 'string', 'max:64'],
            'issued_on' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['pending', 'issued', 'revoked'])],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
