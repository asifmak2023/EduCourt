<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentClubResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category,
            'description' => $this->description,
            'patron_user_id' => $this->patron_user_id,
            'patron' => UserResource::make($this->whenLoaded('patron')),
            'is_active' => (bool) $this->is_active,
            'members_count' => $this->whenCounted('memberships'),
            'memberships' => ClubMembershipResource::collection($this->whenLoaded('memberships')),
            'created_at' => $this->created_at,
        ];
    }
}
