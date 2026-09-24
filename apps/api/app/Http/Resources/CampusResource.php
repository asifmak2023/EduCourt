<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'email' => $this->email,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'website' => $this->website,
            'address' => $this->address,
            'is_active' => $this->is_active,
            'institution' => InstitutionResource::make($this->whenLoaded('institution')),
            'created_at' => $this->created_at,
        ];
    }
}
