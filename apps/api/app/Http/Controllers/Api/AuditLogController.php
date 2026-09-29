<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $events = $request->string('event')->toString();
        $logName = $request->string('log_name')->toString();
        $subjectType = $request->string('subject_type')->toString();
        $search = $request->string('search')->toString();

        $activities = $this->scoped($request)
            ->with('causer')
            ->when($logName !== '', fn (Builder $query) => $query->where('log_name', $logName))
            ->when($events !== '', fn (Builder $query) => $query->where('event', $events))
            ->when($subjectType !== '', fn (Builder $query) => $query
                ->where('subject_type', 'like', "%{$subjectType}%"))
            ->when($request->filled('causer_id'), fn (Builder $query) => $query
                ->where('causer_id', $request->integer('causer_id')))
            ->when($search !== '', fn (Builder $query) => $query
                ->where(fn (Builder $inner) => $inner
                    ->where('description', 'like', "%{$search}%")
                    ->orWhere('log_name', 'like', "%{$search}%")))
            ->when($request->filled('from'), fn (Builder $query) => $query
                ->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query
                ->whereDate('created_at', '<=', $request->date('to')))
            ->latest('id')
            ->paginate($request->integer('per_page', 25));

        return ActivityLogResource::collection($activities);
    }

    public function filters(Request $request): JsonResponse
    {
        $query = $this->scoped($request);

        return response()->json([
            'data' => [
                'log_names' => (clone $query)->reorder()->distinct()->pluck('log_name')
                    ->filter()->values(),
                'events' => (clone $query)->reorder()->distinct()->pluck('event')
                    ->filter()->values(),
                'subject_types' => (clone $query)->reorder()->distinct()->pluck('subject_type')
                    ->filter()->map(fn (string $type) => class_basename($type))->unique()->values(),
            ],
        ]);
    }

    /**
     * @return Builder<Activity>
     */
    private function scoped(Request $request): Builder
    {
        $query = Activity::query();
        $user = $request->user();

        if ($user === null || $user->isPlatformAdmin()) {
            return $query;
        }

        $campusIds = $user->allowedCampusIds();
        $causerIds = User::query()
            ->whereIn('campus_id', $campusIds === [] ? [-1] : $campusIds)
            ->pluck('id')
            ->push($user->id);

        return $query
            ->where('causer_type', (new User)->getMorphClass())
            ->whereIn('causer_id', $causerIds);
    }
}
