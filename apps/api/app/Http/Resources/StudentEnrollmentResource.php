<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentEnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'section_id' => $this->section_id,
            'roll_number' => $this->roll_number,
            'status' => $this->status?->value,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'notes' => $this->notes,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'academic_year' => AcademicYearResource::make($this->whenLoaded('academicYear')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'section' => SectionResource::make($this->whenLoaded('section')),
            'created_at' => $this->created_at,
        ];
    }
}
