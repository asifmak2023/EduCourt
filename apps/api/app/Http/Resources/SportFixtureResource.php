<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportFixtureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_id' => $this->sport_id,
            'sport' => SportResource::make($this->whenLoaded('sport')),
            'sport_team_id' => $this->sport_team_id,
            'team' => SportTeamResource::make($this->whenLoaded('team')),
            'opponent' => $this->opponent,
            'home_away' => $this->home_away,
            'venue' => $this->venue,
            'fixture_date' => $this->fixture_date?->toDateString(),
            'start_time' => $this->start_time,
            'status' => $this->status?->value,
            'our_score' => $this->our_score,
            'opponent_score' => $this->opponent_score,
            'outcome' => $this->outcome?->value,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
