<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentCertificateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'type' => $this->type,
            'title' => $this->title,
            'serial_no' => $this->serial_no,
            'issued_on' => $this->issued_on?->toDateString(),
            'status' => $this->status?->value,
            'issued_by' => $this->issued_by,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
