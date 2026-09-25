<?php

namespace App\Http\Controllers\Api;

use App\Enums\DayOfWeek;
use App\Enums\SubstituteStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SubstituteAssignmentResource;
use App\Models\SubstituteAssignment;
use App\Models\TimetableSlot;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SubstituteAssignmentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $assignments = SubstituteAssignment::query()
            ->with(['timetableSlot.period', 'timetableSlot.classRoom', 'timetableSlot.section', 'timetableSlot.subject', 'timetableSlot.teacher', 'substitute'])
            ->when($request->filled('date'), fn ($q) => $q->whereDate('date', $request->date('date')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('date', '<=', $request->date('to')))
            ->when($request->filled('substitute_user_id'), fn ($q) => $q->where('substitute_user_id', $request->integer('substitute_user_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->whereHas('timetableSlot', fn ($slot) => $slot->where('class_room_id', $request->integer('class_room_id'))))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return SubstituteAssignmentResource::collection($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $campusId = $tenant['campus_id'];

        $data = $request->validate([
            'timetable_slot_id' => [
                'required', 'integer',
                Rule::exists('timetable_slots', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'substitute_user_id' => [
                'required', 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'date' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $slot = TimetableSlot::query()->findOrFail($data['timetable_slot_id']);

        $isoWeekday = Carbon::parse($data['date'])->isoWeekday();

        if ($isoWeekday !== (int) $slot->day_of_week) {
            throw ValidationException::withMessages([
                'date' => ["The date falls on {$this->dayLabel($isoWeekday)} but the slot runs on {$this->dayLabel((int) $slot->day_of_week)}."],
            ]);
        }

        if ((int) $slot->teacher_user_id === (int) $data['substitute_user_id']) {
            throw ValidationException::withMessages([
                'substitute_user_id' => ['The substitute must be different from the slot teacher.'],
            ]);
        }

        if (SubstituteAssignment::query()
            ->where('timetable_slot_id', $slot->id)
            ->whereDate('date', $data['date'])
            ->where('status', SubstituteStatus::Scheduled->value)
            ->exists()) {
            throw ValidationException::withMessages([
                'timetable_slot_id' => ['A substitute is already scheduled for this slot on that date.'],
            ]);
        }

        if (SubstituteAssignment::query()
            ->whereDate('date', $data['date'])
            ->where('substitute_user_id', $data['substitute_user_id'])
            ->where('status', SubstituteStatus::Scheduled->value)
            ->whereHas('timetableSlot', fn ($query) => $query->where('period_id', $slot->period_id))
            ->exists()) {
            throw ValidationException::withMessages([
                'substitute_user_id' => ['The substitute already covers another class in this period on that date.'],
            ]);
        }

        if (TimetableSlot::query()
            ->where('teacher_user_id', $data['substitute_user_id'])
            ->where('day_of_week', $isoWeekday)
            ->where('period_id', $slot->period_id)
            ->exists()) {
            throw ValidationException::withMessages([
                'substitute_user_id' => ['The substitute already teaches another class in this period on that weekday.'],
            ]);
        }

        $assignment = SubstituteAssignment::create($data + $tenant + [
            'status' => SubstituteStatus::Scheduled,
            'created_by' => $request->user()->id,
        ]);

        return (new SubstituteAssignmentResource($assignment->load(['timetableSlot.period', 'timetableSlot.classRoom', 'timetableSlot.subject', 'substitute'])))
            ->response()->setStatusCode(201);
    }

    public function show(SubstituteAssignment $substituteAssignment): SubstituteAssignmentResource
    {
        return new SubstituteAssignmentResource($substituteAssignment->load(['timetableSlot.period', 'timetableSlot.classRoom', 'timetableSlot.subject', 'timetableSlot.teacher', 'substitute']));
    }

    public function cancel(SubstituteAssignment $substituteAssignment): SubstituteAssignmentResource
    {
        if ($substituteAssignment->status === SubstituteStatus::Cancelled) {
            throw ValidationException::withMessages([
                'status' => ['The substitute assignment is already cancelled.'],
            ]);
        }

        $substituteAssignment->update(['status' => SubstituteStatus::Cancelled]);

        return new SubstituteAssignmentResource($substituteAssignment->refresh()->load(['timetableSlot.period', 'timetableSlot.classRoom', 'timetableSlot.subject', 'substitute']));
    }

    public function destroy(SubstituteAssignment $substituteAssignment): JsonResponse
    {
        $substituteAssignment->delete();

        return response()->json(['message' => 'Substitute assignment archived.']);
    }

    private function dayLabel(int $isoWeekday): string
    {
        return DayOfWeek::tryFrom($isoWeekday)?->label() ?? "day {$isoWeekday}";
    }
}
