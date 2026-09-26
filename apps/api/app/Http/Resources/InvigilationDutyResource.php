<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvigilationDutyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_paper_id' => $this->exam_paper_id,
            'user_id' => $this->user_id,
            'role' => $this->role?->value,
            'notes' => $this->notes,
            'user' => UserResource::make($this->whenLoaded('user')),
            'created_at' => $this->created_at,
        ];
    }
}
