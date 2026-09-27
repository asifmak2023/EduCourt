<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseRegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'term_id' => $this->term_id,
            'term' => TermResource::make($this->whenLoaded('term')),
            'class_room_id' => $this->class_room_id,
            'subject_id' => $this->subject_id,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'credit_hours' => (float) $this->credit_hours,
            'status' => $this->status?->value,
            'registered_on' => $this->registered_on,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
