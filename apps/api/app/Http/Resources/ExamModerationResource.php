<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamModerationResource extends JsonResource
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
            'type' => $this->type?->value,
            'value' => (float) $this->value,
            'reason' => $this->reason,
            'status' => $this->status?->value,
            'created_by' => $this->created_by,
            'approved_by' => $this->approved_by,
            'applied_at' => $this->applied_at,
            'created_at' => $this->created_at,
        ];
    }
}
