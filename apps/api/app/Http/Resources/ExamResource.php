<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'term_id' => $this->term_id,
            'exam_type_id' => $this->exam_type_id,
            'name' => $this->name,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'status' => $this->status?->value,
            'description' => $this->description,
            'exam_type' => ExamTypeResource::make($this->whenLoaded('examType')),
            'papers' => ExamPaperResource::collection($this->whenLoaded('papers')),
            'created_at' => $this->created_at,
        ];
    }
}
