<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeachingAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'teacher_user_id' => $this->teacher_user_id,
            'subject_id' => $this->subject_id,
            'class_room_id' => $this->class_room_id,
            'section_id' => $this->section_id,
            'weekly_periods' => $this->weekly_periods,
            'is_active' => $this->is_active,
            'teacher' => UserResource::make($this->whenLoaded('teacher')),
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'section' => SectionResource::make($this->whenLoaded('section')),
            'created_at' => $this->created_at,
        ];
    }
}
