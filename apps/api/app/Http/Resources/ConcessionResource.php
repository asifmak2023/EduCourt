<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConcessionResource extends JsonResource
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
            ]),
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'concession_policy_id' => $this->concession_policy_id,
            'policy' => $this->whenLoaded('policy', fn () => $this->policy === null ? null : [
                'id' => $this->policy->id,
                'name' => $this->policy->name,
                'code' => $this->policy->code,
                'type' => $this->policy->type?->value,
            ]),
            'discount_type' => $this->discount_type?->value,
            'discount_type_label' => $this->discount_type?->label(),
            'value' => $this->value,
            'amount' => $this->amount,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'note' => $this->note,
            'requested_by' => $this->whenLoaded('requestedBy', fn () => $this->requestedBy?->name),
            'approved_by' => $this->whenLoaded('approvedBy', fn () => $this->approvedBy?->name),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at,
        ];
    }
}
