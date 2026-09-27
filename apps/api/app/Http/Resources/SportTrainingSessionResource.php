<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportTrainingSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_team_id' => $this->sport_team_id,
            'team' => SportTeamResource::make($this->whenLoaded('team')),
            'title' => $this->title,
            'session_date' => $this->session_date?->toDateString(),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'venue' => $this->venue,
            'focus' => $this->focus,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
