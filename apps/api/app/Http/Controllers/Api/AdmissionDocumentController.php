<?php

namespace App\Http\Controllers\Api;

use App\Enums\AdmissionDocumentType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdmissionDocumentResource;
use App\Models\Admission;
use App\Models\AdmissionDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdmissionDocumentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Admission $admission): AnonymousResourceCollection
    {
        $documents = $admission->documents()
            ->with('uploadedBy')
            ->orderByDesc('id')
            ->get();

        return AdmissionDocumentResource::collection($documents);
    }

    public function store(Request $request, Admission $admission): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(AdmissionDocumentType::class)],
            'title' => ['nullable', 'string', 'max:191'],
            'file' => [
                'required', 'file', 'max:10240',
                'mimes:pdf,jpg,jpeg,png,webp,doc,docx',
            ],
        ]);

        $file = $request->file('file');
        $tenant = $this->academicTenantAttributes();

        $path = $file->store("admission-documents/{$admission->id}", 'local');

        $document = $admission->documents()->create([
            'institution_id' => $tenant['institution_id'],
            'campus_id' => $tenant['campus_id'],
            'type' => $data['type'],
            'title' => $data['title'] ?? $file->getClientOriginalName(),
            'file_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return (new AdmissionDocumentResource($document->load('uploadedBy')))
            ->response()->setStatusCode(201);
    }

    public function download(Admission $admission, AdmissionDocument $document): StreamedResponse
    {
        $this->assertBelongsToAdmission($admission, $document);

        abort_unless(Storage::disk('local')->exists($document->file_path), 404, 'File not found.');

        return Storage::disk('local')->download($document->file_path, $document->original_name);
    }

    public function destroy(Admission $admission, AdmissionDocument $document): JsonResponse
    {
        $this->assertBelongsToAdmission($admission, $document);

        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return response()->json(['message' => 'Document removed.']);
    }

    private function assertBelongsToAdmission(Admission $admission, AdmissionDocument $document): void
    {
        abort_unless($document->admission_id === $admission->id, 404);
    }
}
