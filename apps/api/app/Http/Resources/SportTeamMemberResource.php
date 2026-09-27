<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportTeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_team_id' => $this->sport_team_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'position' => $this->position,
            'jersey_no' => $this->jersey_no,
            'joined_on' => $this->joined_on?->toDateString(),
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
