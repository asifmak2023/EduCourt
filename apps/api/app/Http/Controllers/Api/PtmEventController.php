<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\PtmEventResource;
use App\Http\Resources\PtmSlotResource;
use App\Models\PtmEvent;
use App\Models\PtmSlot;
use App\Services\Access\TeacherScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class PtmEventController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TeacherScope $teacherScope) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $events = PtmEvent::query()
            ->withCount('slots')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('event_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('event_date', '<=', $request->date('to')))
            ->orderByDesc('event_date');

        if ($this->teacherScope->isTeacherScoped($request->user())) {
            $events->whereHas('slots', fn ($q) => $q->where('teacher_user_id', $request->user()->id));
        }

        $events = $events->paginate($request->integer('per_page', 50));

        return PtmEventResource::collection($events);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $event = PtmEvent::create($data + $tenant + [
            'status' => $data['status'] ?? 'scheduled',
            'created_by' => $request->user()?->id,
        ]);

        return (new PtmEventResource($event))->response()->setStatusCode(201);
    }

    public function show(Request $request, PtmEvent $ptmEvent): PtmEventResource
    {
        $this->guardEvent($request, $ptmEvent);

        return new PtmEventResource(
            $ptmEvent->load(['slots.teacher', 'slots.bookings.student'])
        );
    }

    public function update(Request $request, PtmEvent $ptmEvent): PtmEventResource
    {
        $this->guardEvent($request, $ptmEvent);

        $ptmEvent->update($request->validate($this->rules(false)));

        return new PtmEventResource($ptmEvent->refresh()->load('slots.teacher'));
    }

    public function destroy(Request $request, PtmEvent $ptmEvent): JsonResponse
    {
        $this->guardEvent($request, $ptmEvent);

        $ptmEvent->delete();

        return response()->json(['message' => 'PTM event removed.']);
    }

    public function addSlot(Request $request, PtmEvent $ptmEvent): JsonResponse
    {
        $this->guardEvent($request, $ptmEvent);

        $data = $request->validate($this->slotRules());

        $slot = $ptmEvent->slots()->create($data + [
            'institution_id' => $ptmEvent->institution_id,
            'campus_id' => $ptmEvent->campus_id,
            'booked' => 0,
        ]);

        return (new PtmSlotResource($slot->load('teacher')))->response()->setStatusCode(201);
    }

    public function updateSlot(Request $request, PtmSlot $slot): PtmSlotResource
    {
        $this->guardSlot($request, $slot);

        $data = $request->validate($this->slotRules(false));

        if (isset($data['capacity']) && $data['capacity'] < $slot->booked) {
            abort(422, 'Capacity cannot be lower than the number of bookings.');
        }

        $slot->update($data);

        return new PtmSlotResource($slot->refresh()->load('teacher'));
    }

    public function destroySlot(Request $request, PtmSlot $slot): JsonResponse
    {
        $this->guardSlot($request, $slot);

        if ($slot->booked > 0) {
            abort(422, 'Remove the slot bookings before deleting the slot.');
        }

        $slot->delete();

        return response()->json(['message' => 'PTM slot removed.']);
    }

    private function guardEvent(Request $request, PtmEvent $event): void
    {
        $user = $request->user();

        if (! $this->teacherScope->isTeacherScoped($user)) {
            return;
        }

        abort_unless(
            $event->slots()->where('teacher_user_id', $user->id)->exists(),
            403,
            'This PTM event is outside your assigned slots.',
        );
    }

    private function guardSlot(Request $request, PtmSlot $slot): void
    {
        $user = $request->user();

        if (! $this->teacherScope->isTeacherScoped($user)) {
            return;
        }

        abort_unless((int) $slot->teacher_user_id === (int) $user->id, 403, 'This PTM slot is outside your assignments.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'title' => [$presence, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'event_date' => [$presence, 'date'],
            'venue' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['scheduled', 'ongoing', 'completed', 'cancelled'])],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function slotRules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'teacher_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'start_time' => [$presence, 'date_format:H:i'],
            'end_time' => [$presence, 'date_format:H:i', 'after:start_time'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'room' => ['nullable', 'string', 'max:64'],
        ];
    }
}
