<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimetableSlotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'term_id' => $this->term_id,
            'class_room_id' => $this->class_room_id,
            'section_id' => $this->section_id,
            'period_id' => $this->period_id,
            'day_of_week' => $this->day_of_week,
            'subject_id' => $this->subject_id,
            'teacher_user_id' => $this->teacher_user_id,
            'room_id' => $this->room_id,
            'is_published' => $this->is_published,
            'notes' => $this->notes,
            'period' => PeriodResource::make($this->whenLoaded('period')),
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'teacher' => UserResource::make($this->whenLoaded('teacher')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'section' => SectionResource::make($this->whenLoaded('section')),
            'room' => RoomResource::make($this->whenLoaded('room')),
            'created_at' => $this->created_at,
        ];
    }
}
