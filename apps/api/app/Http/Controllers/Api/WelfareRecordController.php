<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\WelfareRecordResource;
use App\Models\WelfareRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class WelfareRecordController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $records = WelfareRecord::query()
            ->with('student')
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('recorded_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('recorded_on', '<=', $request->date('to')))
            ->orderByDesc('recorded_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return WelfareRecordResource::collection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $record = WelfareRecord::create($data + $tenant + [
            'recorded_by' => $request->user()?->id,
            'status' => $data['status'] ?? 'open',
        ]);

        return (new WelfareRecordResource($record->load('student')))->response()->setStatusCode(201);
    }

    public function show(WelfareRecord $welfareRecord): WelfareRecordResource
    {
        return new WelfareRecordResource($welfareRecord->load('student'));
    }

    public function update(Request $request, WelfareRecord $welfareRecord): WelfareRecordResource
    {
        $welfareRecord->update($request->validate($this->rules($welfareRecord->campus_id, false)));

        return new WelfareRecordResource($welfareRecord->load('student'));
    }

    public function destroy(WelfareRecord $welfareRecord): JsonResponse
    {
        $welfareRecord->delete();

        return response()->json(['message' => 'Welfare record removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [$presence, 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'type' => [$presence, Rule::in(['health', 'medical', 'welfare', 'incident'])],
            'title' => [$presence, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'recorded_on' => [$presence, 'date'],
            'status' => ['sometimes', Rule::in(['open', 'monitoring', 'closed'])],
            'follow_up' => ['nullable', 'string'],
        ];
    }
}
