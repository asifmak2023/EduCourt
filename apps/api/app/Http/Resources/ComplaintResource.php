<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'reference_no' => $this->reference_no,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'raised_by' => $this->raised_by,
            'against' => $this->against,
            'category' => $this->category,
            'subject' => $this->subject,
            'description' => $this->description,
            'priority' => $this->priority?->value,
            'status' => $this->status?->value,
            'assigned_to' => $this->assigned_to,
            'resolution' => $this->resolution,
            'resolved_at' => $this->resolved_at,
            'created_at' => $this->created_at,
        ];
    }
}
