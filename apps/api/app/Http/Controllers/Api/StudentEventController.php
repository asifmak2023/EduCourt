<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventParticipantResource;
use App\Http\Resources\StudentEventResource;
use App\Models\EventParticipant;
use App\Models\StudentEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentEventController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $events = StudentEvent::query()
            ->with('organizer')
            ->withCount('participants')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('starts_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('starts_on', '<=', $request->date('to')))
            ->orderByDesc('starts_on')
            ->paginate($request->integer('per_page', 50));

        return StudentEventResource::collection($events);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        $event = StudentEvent::create($data + $this->academicTenantAttributes() + [
            'organizer_user_id' => $request->user()?->id,
            'status' => $data['status'] ?? 'planned',
        ]);

        return (new StudentEventResource($event))->response()->setStatusCode(201);
    }

    public function show(StudentEvent $event): StudentEventResource
    {
        return new StudentEventResource($event->load('organizer')->loadCount('participants'));
    }

    public function update(Request $request, StudentEvent $event): StudentEventResource
    {
        $event->update($request->validate($this->rules(false)));

        return new StudentEventResource($event->load('organizer'));
    }

    public function destroy(StudentEvent $event): JsonResponse
    {
        $event->delete();

        return response()->json(['message' => 'Event removed.']);
    }

    public function participants(Request $request, StudentEvent $event): AnonymousResourceCollection
    {
        $participants = EventParticipant::query()
            ->with('student')
            ->where('student_event_id', $event->id)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('id')
            ->paginate($request->integer('per_page', 50));

        return EventParticipantResource::collection($participants);
    }

    public function addParticipant(Request $request, StudentEvent $event): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])],
            'role' => ['nullable', 'string', 'max:64'],
            'status' => ['sometimes', Rule::in(['registered', 'attended', 'absent'])],
            'position' => ['nullable', 'string', 'max:64'],
            'remarks' => ['nullable', 'string'],
        ]);

        $participant = EventParticipant::updateOrCreate(
            ['student_event_id' => $event->id, 'student_id' => $data['student_id']],
            $data + $tenant + ['status' => $data['status'] ?? 'registered'],
        );

        return (new EventParticipantResource($participant->load('student')))->response()->setStatusCode(201);
    }

    public function updateParticipant(Request $request, StudentEvent $event, EventParticipant $participant): EventParticipantResource
    {
        abort_unless($participant->student_event_id === $event->id, 404);

        $participant->update($request->validate([
            'role' => ['nullable', 'string', 'max:64'],
            'status' => ['sometimes', Rule::in(['registered', 'attended', 'absent'])],
            'position' => ['nullable', 'string', 'max:64'],
            'remarks' => ['nullable', 'string'],
        ]));

        return new EventParticipantResource($participant->load('student'));
    }

    public function removeParticipant(StudentEvent $event, EventParticipant $participant): JsonResponse
    {
        abort_unless($participant->student_event_id === $event->id, 404);

        $participant->delete();

        return response()->json(['message' => 'Participant removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'title' => [$presence, 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:64'],
            'description' => ['nullable', 'string'],
            'starts_on' => [$presence, 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'venue' => ['nullable', 'string', 'max:255'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['planned', 'ongoing', 'completed', 'cancelled'])],
        ];
    }
}
