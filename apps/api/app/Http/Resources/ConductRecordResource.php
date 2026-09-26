<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConductRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => $this->student?->full_name),
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'category' => $this->category?->value,
            'category_label' => $this->category?->label(),
            'severity' => $this->severity?->value,
            'severity_label' => $this->severity?->label(),
            'title' => $this->title,
            'description' => $this->description,
            'action_taken' => $this->action_taken,
            'occurred_on' => $this->occurred_on?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'reported_by' => $this->whenLoaded('reportedBy', fn () => $this->reportedBy?->name),
            'resolved_by' => $this->whenLoaded('resolvedBy', fn () => $this->resolvedBy?->name),
            'resolved_at' => $this->resolved_at,
            'resolution_note' => $this->resolution_note,
            'created_at' => $this->created_at,
        ];
    }
}
