<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItBackupLogResource;
use App\Models\ItBackupLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ItBackupLogController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = ItBackupLog::query()
            ->with('checker')
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('started_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('started_at', '<=', $request->date('to')))
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ItBackupLogResource::collection($logs);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $log = ItBackupLog::create($data + $tenant + [
            'type' => $data['type'] ?? 'database',
            'status' => $data['status'] ?? 'success',
            'checked_by' => $data['checked_by'] ?? $request->user()?->id,
        ]);

        return (new ItBackupLogResource($log->load('checker')))->response()->setStatusCode(201);
    }

    public function show(ItBackupLog $backupLog): ItBackupLogResource
    {
        return new ItBackupLogResource($backupLog->load('checker'));
    }

    public function update(Request $request, ItBackupLog $backupLog): ItBackupLogResource
    {
        $backupLog->update($request->validate($this->rules(false)));

        return new ItBackupLogResource($backupLog->load('checker'));
    }

    public function destroy(ItBackupLog $backupLog): JsonResponse
    {
        $backupLog->delete();

        return response()->json(['message' => 'Backup log removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['database', 'files', 'server', 'config'])],
            'status' => ['sometimes', Rule::in(['success', 'partial', 'failed'])],
            'started_at' => ['nullable', 'date'],
            'finished_at' => ['nullable', 'date'],
            'size_mb' => ['nullable', 'numeric', 'min:0'],
            'location' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'checked_by' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}
