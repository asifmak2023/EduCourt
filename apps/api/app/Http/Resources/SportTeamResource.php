<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportTeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_id' => $this->sport_id,
            'sport' => SportResource::make($this->whenLoaded('sport')),
            'name' => $this->name,
            'age_group' => $this->age_group,
            'gender' => $this->gender,
            'coach_user_id' => $this->coach_user_id,
            'coach' => UserResource::make($this->whenLoaded('coach')),
            'is_active' => (bool) $this->is_active,
            'notes' => $this->notes,
            'members_count' => $this->whenCounted('members'),
            'created_at' => $this->created_at,
        ];
    }
}
