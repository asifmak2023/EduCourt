<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportAchievementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_id' => $this->sport_id,
            'sport' => SportResource::make($this->whenLoaded('sport')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'title' => $this->title,
            'level' => $this->level,
            'position' => $this->position,
            'achieved_on' => $this->achieved_on?->toDateString(),
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }
}
