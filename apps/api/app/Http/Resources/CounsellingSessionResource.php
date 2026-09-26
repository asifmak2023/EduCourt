<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CounsellingSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'counsellor_user_id' => $this->counsellor_user_id,
            'counsellor' => UserResource::make($this->whenLoaded('counsellor')),
            'session_date' => $this->session_date?->toDateString(),
            'type' => $this->type,
            'status' => $this->status?->value,
            'summary' => $this->summary,
            'confidential_notes' => $this->when(
                $request->user()?->can('counselling.view') ?? false,
                $this->confidential_notes,
            ),
            'follow_up_on' => $this->follow_up_on?->toDateString(),
            'created_at' => $this->created_at,
        ];
    }
}
