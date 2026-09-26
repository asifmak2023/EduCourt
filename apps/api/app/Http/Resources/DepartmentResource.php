<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'head' => UserResource::make($this->whenLoaded('head')),
            'designations_count' => $this->whenCounted('designations'),
            'staff_count' => $this->whenCounted('staffMembers'),
            'created_at' => $this->created_at,
        ];
    }
}
