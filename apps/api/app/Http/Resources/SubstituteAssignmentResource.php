<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubstituteAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'reason' => $this->reason,
            'timetable_slot_id' => $this->timetable_slot_id,
            'slot' => $this->whenLoaded('timetableSlot', fn () => [
                'id' => $this->timetableSlot->id,
                'day_of_week' => $this->timetableSlot->day_of_week,
                'period' => $this->timetableSlot->period?->name,
                'class_room' => $this->timetableSlot->classRoom?->name,
                'section' => $this->timetableSlot->section?->name,
                'subject' => $this->timetableSlot->subject?->name,
                'original_teacher' => $this->timetableSlot->teacher?->name,
            ]),
            'substitute_user_id' => $this->substitute_user_id,
            'substitute' => $this->whenLoaded('substitute', fn () => [
                'id' => $this->substitute->id,
                'name' => $this->substitute->name,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
