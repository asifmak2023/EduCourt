<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category?->value,
            'season' => $this->season,
            'coach_user_id' => $this->coach_user_id,
            'coach' => UserResource::make($this->whenLoaded('coach')),
            'min_age_years' => $this->min_age_years,
            'max_age_years' => $this->max_age_years,
            'min_attendance_percent' => $this->min_attendance_percent,
            'budget' => $this->budget,
            'is_active' => (bool) $this->is_active,
            'rules' => $this->rules,
            'description' => $this->description,
            'teams_count' => $this->whenCounted('teams'),
            'created_at' => $this->created_at,
        ];
    }
}
