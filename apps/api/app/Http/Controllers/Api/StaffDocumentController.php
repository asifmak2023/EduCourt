<?php

namespace App\Http\Controllers\Api;

use App\Enums\StaffDocumentType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffDocumentResource;
use App\Models\StaffDocument;
use App\Models\StaffMember;
use App\Services\Files\FileScanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StaffDocumentController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly FileScanner $scanner) {}

    public function index(StaffMember $staffMember): AnonymousResourceCollection
    {
        $documents = $staffMember->documents()
            ->with(['uploadedBy', 'verifiedBy'])
            ->orderByDesc('id')
            ->get();

        return StaffDocumentResource::collection($documents);
    }

    public function store(Request $request, StaffMember $staffMember): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(StaffDocumentType::class)],
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

        $path = $file->store("staff-documents/{$staffMember->id}", 'local');

        $document = $staffMember->documents()->create([
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

        return (new StaffDocumentResource($document->load(['uploadedBy', 'verifiedBy'])))
            ->response()->setStatusCode(201);
    }

    public function verify(Request $request, StaffMember $staffMember, StaffDocument $document): StaffDocumentResource
    {
        $this->assertBelongsToStaff($staffMember, $document);

        $document->update([
            'is_verified' => true,
            'verified_by' => $request->user()?->id,
            'verified_at' => now(),
        ]);

        return new StaffDocumentResource($document->refresh()->load(['uploadedBy', 'verifiedBy']));
    }

    public function download(StaffMember $staffMember, StaffDocument $document): StreamedResponse
    {
        $this->assertBelongsToStaff($staffMember, $document);

        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'File not found.');

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function destroy(StaffMember $staffMember, StaffDocument $document): JsonResponse
    {
        $this->assertBelongsToStaff($staffMember, $document);

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

    private function assertBelongsToStaff(StaffMember $staffMember, StaffDocument $document): void
    {
        abort_unless($document->staff_member_id === $staffMember->id, 404);
    }
}
