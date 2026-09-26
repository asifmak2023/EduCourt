<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SyllabusUnitResource extends JsonResource
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
            'term_id' => $this->term_id,
            'title' => $this->title,
            'description' => $this->description,
            'sequence' => $this->sequence,
            'estimated_periods' => $this->estimated_periods,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'term' => TermResource::make($this->whenLoaded('term')),
            'created_at' => $this->created_at,
        ];
    }
}
