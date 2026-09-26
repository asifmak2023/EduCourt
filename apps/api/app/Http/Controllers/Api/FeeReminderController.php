<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReminderStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeReminderResource;
use App\Models\FeeReminder;
use App\Services\Reminders\ReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class FeeReminderController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ReminderService $reminders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $reminders = FeeReminder::query()
            ->with(['student', 'guardian', 'academicYear'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('channel'), fn ($q) => $q->where('channel', $request->string('channel')->toString()))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return FeeReminderResource::collection($reminders);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'as_of' => ['nullable', 'date'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'class_room_id' => ['nullable', 'integer', 'exists:class_rooms,id'],
            'channel' => ['nullable', Rule::in(['email', 'sms', 'in_app'])],
            'overdue_only' => ['nullable', 'boolean'],
            'min_days_overdue' => ['nullable', 'integer', 'min:0'],
            'min_balance' => ['nullable', 'numeric', 'min:0'],
            'force' => ['nullable', 'boolean'],
        ]);

        $result = $this->reminders->generate($tenant, $data, $request->user()?->id);

        return response()->json([
            'message' => "{$result['created']->count()} reminder(s) queued, {$result['skipped']} skipped.",
            'created' => $result['created']->count(),
            'skipped' => $result['skipped'],
            'data' => FeeReminderResource::collection(
                $result['created']->load(['student', 'guardian', 'academicYear'])
            ),
        ], 201);
    }

    public function show(FeeReminder $reminder): FeeReminderResource
    {
        return new FeeReminderResource($reminder->load(['student', 'guardian', 'academicYear']));
    }

    public function send(FeeReminder $reminder): FeeReminderResource
    {
        return new FeeReminderResource(
            $this->reminders->send($reminder)->load(['student', 'guardian', 'academicYear'])
        );
    }

    public function sendBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['nullable', 'array'],
            'ids.*' => ['integer', 'exists:fee_reminders,id'],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
        ]);

        $this->academicTenantAttributes();

        $reminders = FeeReminder::query()
            ->where('status', ReminderStatus::Pending->value)
            ->when(! empty($data['ids']), fn ($q) => $q->whereIn('id', $data['ids']))
            ->when(isset($data['academic_year_id']), fn ($q) => $q->where('academic_year_id', $data['academic_year_id']))
            ->get();

        $sent = 0;

        foreach ($reminders as $reminder) {
            if ($this->reminders->send($reminder)->status === ReminderStatus::Sent) {
                $sent++;
            }
        }

        return response()->json([
            'message' => "{$sent} reminder(s) sent.",
            'sent' => $sent,
            'attempted' => $reminders->count(),
        ]);
    }

    public function cancel(FeeReminder $reminder): FeeReminderResource
    {
        return new FeeReminderResource(
            $this->reminders->cancel($reminder)->load(['student', 'guardian', 'academicYear'])
        );
    }

    public function destroy(FeeReminder $reminder): JsonResponse
    {
        $reminder->delete();

        return response()->json(['message' => 'Reminder deleted.']);
    }
}
