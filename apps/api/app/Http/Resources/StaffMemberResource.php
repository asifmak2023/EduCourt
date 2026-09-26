<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'user_id' => $this->user_id,
            'employee_no' => $this->employee_no,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->fullName(),
            'gender' => $this->gender,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'cnic' => $this->cnic,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'employment_type' => $this->employment_type?->value,
            'employment_type_label' => $this->employment_type?->label(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'joining_date' => $this->joining_date?->toDateString(),
            'leaving_date' => $this->leaving_date?->toDateString(),
            'bank_name' => $this->bank_name,
            'bank_account_no' => $this->bank_account_no,
            'tax_number' => $this->tax_number,
            'notes' => $this->notes,
            'department' => DepartmentResource::make($this->whenLoaded('department')),
            'designation' => DesignationResource::make($this->whenLoaded('designation')),
            'user' => UserResource::make($this->whenLoaded('user')),
            'documents' => StaffDocumentResource::collection($this->whenLoaded('documents')),
            'created_at' => $this->created_at,
        ];
    }
}
