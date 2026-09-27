<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamSupplementaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'original_exam_id' => $this->original_exam_id,
            'original_exam' => ExamResource::make($this->whenLoaded('originalExam')),
            'exam_id' => $this->exam_id,
            'exam' => ExamResource::make($this->whenLoaded('exam')),
            'exam_paper_id' => $this->exam_paper_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'subject_id' => $this->subject_id,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'fee_amount' => (float) $this->fee_amount,
            'is_paid' => (bool) $this->is_paid,
            'status' => $this->status?->value,
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
