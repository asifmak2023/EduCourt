<?php

namespace App\Http\Controllers\Api;

use App\Enums\NotificationStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AppNotificationResource;
use App\Models\AppNotification;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $notifications = AppNotification::query()
            ->with(['student', 'guardian'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('channel'), fn ($q) => $q->where('channel', $request->string('channel')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return AppNotificationResource::collection($notifications);
    }

    public function show(AppNotification $notification): AppNotificationResource
    {
        return new AppNotificationResource(
            $notification->load(['student', 'guardian'])
        );
    }

    public function queueAbsences(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'attendance_date' => ['required', 'date'],
            'class_room_id' => ['nullable', 'integer'],
        ]);

        $created = $this->notifications->queueAbsencesForDate(
            $tenant,
            $data['attendance_date'],
            $data['class_room_id'] ?? null,
            $request->user()?->id,
        );

        return response()->json([
            'message' => "{$created->count()} absence notice(s) queued.",
            'created' => $created->count(),
            'data' => AppNotificationResource::collection($created->load(['student', 'guardian'])),
        ], 201);
    }

    public function send(AppNotification $notification): AppNotificationResource
    {
        return new AppNotificationResource(
            $this->notifications->send($notification)->load(['student', 'guardian'])
        );
    }

    public function sendBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['nullable', 'array'],
            'ids.*' => ['integer', 'exists:app_notifications,id'],
        ]);

        $this->academicTenantAttributes();

        $notifications = AppNotification::query()
            ->where('status', NotificationStatus::Pending->value)
            ->when(! empty($data['ids']), fn ($q) => $q->whereIn('id', $data['ids']))
            ->get();

        $sent = 0;

        foreach ($notifications as $notification) {
            if ($this->notifications->send($notification)->status === NotificationStatus::Sent) {
                $sent++;
            }
        }

        return response()->json([
            'message' => "{$sent} notification(s) sent.",
            'sent' => $sent,
            'attempted' => $notifications->count(),
        ]);
    }

    public function cancel(AppNotification $notification): AppNotificationResource
    {
        return new AppNotificationResource(
            $this->notifications->cancel($notification)->load(['student', 'guardian'])
        );
    }
}
