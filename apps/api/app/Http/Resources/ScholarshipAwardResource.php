<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScholarshipAwardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scholarship_id' => $this->scholarship_id,
            'scholarship' => $this->whenLoaded('scholarship', fn () => [
                'id' => $this->scholarship->id,
                'name' => $this->scholarship->name,
                'code' => $this->scholarship->code,
                'type' => $this->scholarship->type?->value,
                'discount_type' => $this->scholarship->discount_type?->value,
                'value' => $this->scholarship->value,
            ]),
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->full_name,
                'admission_no' => $this->student->admission_no,
            ]),
            'academic_year_id' => $this->academic_year_id,
            'awarded_on' => $this->awarded_on?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'value_override' => $this->value_override,
            'effective_value' => $this->value_override ?? $this->scholarship?->value,
            'notes' => $this->notes,
            'approved_by' => $this->whenLoaded('approvedBy', fn () => $this->approvedBy?->name),
            'revoked_on' => $this->revoked_on?->toDateString(),
            'created_at' => $this->created_at,
        ];
    }
}
