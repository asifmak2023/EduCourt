<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlumniProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'full_name' => $this->full_name,
            'graduation_year' => $this->graduation_year,
            'current_occupation' => $this->current_occupation,
            'employer' => $this->employer,
            'email' => $this->email,
            'phone' => $this->phone,
            'city' => $this->city,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
