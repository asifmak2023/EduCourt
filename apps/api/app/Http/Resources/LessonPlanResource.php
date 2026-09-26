<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LessonPlanResource extends JsonResource
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
            'syllabus_unit_id' => $this->syllabus_unit_id,
            'created_by' => $this->created_by,
            'approved_by' => $this->approved_by,
            'title' => $this->title,
            'objectives' => $this->objectives,
            'content' => $this->content,
            'resources' => $this->resources,
            'activities' => $this->activities,
            'assessment' => $this->assessment,
            'planned_from' => $this->planned_from?->toDateString(),
            'planned_to' => $this->planned_to?->toDateString(),
            'status' => $this->status?->value,
            'approved_at' => $this->approved_at,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'syllabus_unit' => SyllabusUnitResource::make($this->whenLoaded('syllabusUnit')),
            'created_at' => $this->created_at,
        ];
    }
}
