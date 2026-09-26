<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamMarkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_id' => $this->exam_id,
            'exam_paper_id' => $this->exam_paper_id,
            'student_id' => $this->student_id,
            'class_room_id' => $this->class_room_id,
            'subject_id' => $this->subject_id,
            'marks_obtained' => $this->marks_obtained,
            'is_absent' => $this->is_absent,
            'remarks' => $this->remarks,
            'entered_by' => $this->entered_by,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'created_at' => $this->created_at,
        ];
    }
}
