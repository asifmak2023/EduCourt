<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WelfareRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'type' => $this->type?->value,
            'title' => $this->title,
            'description' => $this->description,
            'recorded_on' => $this->recorded_on?->toDateString(),
            'status' => $this->status,
            'recorded_by' => $this->recorded_by,
            'follow_up' => $this->follow_up,
            'created_at' => $this->created_at,
        ];
    }
}
