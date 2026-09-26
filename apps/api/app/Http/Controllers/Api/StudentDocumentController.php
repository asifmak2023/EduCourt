<?php

namespace App\Http\Controllers\Api;

use App\Enums\AdmissionDocumentType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentDocumentResource;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Services\Files\FileScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentDocumentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FileScanner $scanner) {}

    public function index(Student $student): AnonymousResourceCollection
    {
        $documents = $student->documents()
            ->with(['uploadedBy', 'verifiedBy'])
            ->orderByDesc('id')
            ->get();

        return StudentDocumentResource::collection($documents);
    }

    public function store(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(AdmissionDocumentType::class)],
            'title' => ['nullable', 'string', 'max:191'],
            'issued_on' => ['nullable', 'date'],
            'expires_on' => ['nullable', 'date', 'after_or_equal:issued_on'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'file' => [
                'required', 'file', 'max:10240',
                'mimes:pdf,jpg,jpeg,png,webp,doc,docx',
            ],
        ]);

        $file = $request->file('file');
        $tenant = $this->academicTenantAttributes();

        $this->assertClean($file->getRealPath());

        $path = $file->store("student-documents/{$student->id}", 'local');

        $document = $student->documents()->create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'type' => $data['type'],
            'title' => $data['title'] ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'issued_on' => $data['issued_on'] ?? null,
            'expires_on' => $data['expires_on'] ?? null,
            'notes' => $data['notes'] ?? null,
            'uploaded_by' => $request->user()?->id,
        ]);

        return (new StudentDocumentResource($document->load(['uploadedBy', 'verifiedBy'])))
            ->response()->setStatusCode(201);
    }

    public function verify(Request $request, Student $student, StudentDocument $document): StudentDocumentResource
    {
        $this->assertBelongsToStudent($student, $document);

        $document->update([
            'is_verified' => true,
            'verified_by' => $request->user()?->id,
            'verified_at' => now(),
        ]);

        return new StudentDocumentResource($document->refresh()->load(['uploadedBy', 'verifiedBy']));
    }

    public function download(Student $student, StudentDocument $document): StreamedResponse
    {
        $this->assertBelongsToStudent($student, $document);

        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'File not found.');

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function destroy(Student $student, StudentDocument $document): JsonResponse
    {
        $this->assertBelongsToStudent($student, $document);

        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return response()->json(['message' => 'Document removed.']);
    }

    private function assertClean(?string $absolutePath): void
    {
        if ($absolutePath === null) {
            return;
        }

        $threat = $this->scanner->scan($absolutePath);

        if ($threat !== null) {
            throw ValidationException::withMessages([
                'file' => ["The uploaded file failed a malware scan ({$threat})."],
            ]);
        }
    }

    private function assertBelongsToStudent(Student $student, StudentDocument $document): void
    {
        abort_unless($document->student_id === $student->id, 404);
    }
}
