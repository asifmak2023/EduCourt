<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'application_no' => $this->application_no,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => trim("{$this->first_name} {$this->last_name}"),
            'gender' => $this->gender?->value,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'class_room_id' => $this->class_room_id,
            'class_room' => $this->whenLoaded('classRoom', fn () => $this->classRoom?->name),
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'guardian_name' => $this->guardian_name,
            'guardian_phone' => $this->guardian_phone,
            'guardian_email' => $this->guardian_email,
            'guardian_relation' => $this->guardian_relation,
            'previous_school' => $this->previous_school,
            'address' => $this->address,
            'city' => $this->city,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'applied_on' => $this->applied_on?->toDateString(),
            'decided_on' => $this->decided_on?->toDateString(),
            'decided_by' => $this->whenLoaded('decidedBy', fn () => $this->decidedBy?->name),
            'rejection_reason' => $this->rejection_reason,
            'student_id' => $this->student_id,
            'notes' => $this->notes,
            'documents' => AdmissionDocumentResource::collection($this->whenLoaded('documents')),
            'documents_count' => $this->whenCounted('documents'),
            'created_at' => $this->created_at,
        ];
    }
}
