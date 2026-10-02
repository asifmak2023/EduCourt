<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'user_id' => $this->user_id,
            'admission_no' => $this->admission_no,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'gender' => $this->gender?->value,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'blood_group' => $this->blood_group,
            'nationality' => $this->nationality,
            'religion' => $this->religion,
            'category' => $this->category,
            'national_id' => $this->national_id,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'city' => $this->city,
            'previous_school' => $this->previous_school,
            'admission_date' => $this->admission_date?->toDateString(),
            'status' => $this->status?->value,
            'photo_path' => $this->photo_path,
            'photo_url' => $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null,
            'notes' => $this->notes,
            'guardians' => GuardianResource::collection($this->whenLoaded('guardians')),
            'enrollments' => StudentEnrollmentResource::collection($this->whenLoaded('enrollments')),
            'created_at' => $this->created_at,
        ];
    }
}
