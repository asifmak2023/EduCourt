<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamReevaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'exam_id' => $this->exam_id,
            'exam' => ExamResource::make($this->whenLoaded('exam')),
            'exam_paper_id' => $this->exam_paper_id,
            'paper' => ExamPaperResource::make($this->whenLoaded('paper')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'reason' => $this->reason,
            'status' => $this->status?->value,
            'original_marks' => $this->original_marks === null ? null : (float) $this->original_marks,
            'revised_marks' => $this->revised_marks === null ? null : (float) $this->revised_marks,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
