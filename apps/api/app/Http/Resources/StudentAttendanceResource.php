<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentAttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->full_name,
                'admission_no' => $this->student->admission_no,
                'gender' => $this->student->gender?->value,
            ]),
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'class_room' => $this->whenLoaded('classRoom', fn () => $this->classRoom?->name),
            'section_id' => $this->section_id,
            'section' => $this->whenLoaded('section', fn () => $this->section?->name),
            'attendance_date' => $this->attendance_date?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'remarks' => $this->remarks,
            'marked_by' => $this->whenLoaded('markedBy', fn () => $this->markedBy?->name),
            'created_at' => $this->created_at,
        ];
    }
}
