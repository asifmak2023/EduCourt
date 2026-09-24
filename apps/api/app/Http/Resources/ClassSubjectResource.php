<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassSubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'subject_id' => $this->subject_id,
            'is_elective' => $this->is_elective,
            'weekly_periods' => $this->weekly_periods,
            'is_active' => $this->is_active,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'created_at' => $this->created_at,
        ];
    }
}
