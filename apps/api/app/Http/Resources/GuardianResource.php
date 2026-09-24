<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuardianResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'national_id' => $this->national_id,
            'occupation' => $this->occupation,
            'email' => $this->email,
            'phone' => $this->phone,
            'alternate_phone' => $this->alternate_phone,
            'address' => $this->address,
            'relationship' => $this->whenPivotLoaded('student_guardian', fn () => $this->pivot->relationship),
            'is_primary' => $this->whenPivotLoaded('student_guardian', fn () => (bool) $this->pivot->is_primary),
            'is_emergency_contact' => $this->whenPivotLoaded('student_guardian', fn () => (bool) $this->pivot->is_emergency_contact),
            'students' => StudentResource::collection($this->whenLoaded('students')),
            'created_at' => $this->created_at,
        ];
    }
}
