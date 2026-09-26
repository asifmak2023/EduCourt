<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClubMembershipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_club_id' => $this->student_club_id,
            'club' => StudentClubResource::make($this->whenLoaded('club')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'role' => $this->role,
            'status' => $this->status,
            'joined_on' => $this->joined_on?->toDateString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
