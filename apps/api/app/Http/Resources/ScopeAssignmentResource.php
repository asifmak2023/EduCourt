<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScopeAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'role' => $this->role?->value,
            'role_label' => $this->role?->label(),
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'scope_type' => $this->scope_type?->value,
            'scope_id' => $this->scope_id,
            'is_active' => $this->is_active,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'campus' => CampusResource::make($this->whenLoaded('campus')),
            'created_at' => $this->created_at,
        ];
    }
}
