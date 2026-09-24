<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChartOfAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'parent_id' => $this->parent_id,
            'code' => $this->code,
            'name' => $this->name,
            'account_type' => $this->account_type?->value,
            'normal_balance' => $this->normal_balance?->value,
            'is_group' => $this->is_group,
            'is_active' => $this->is_active,
            'description' => $this->description,
            'children' => self::collection($this->whenLoaded('children')),
            'created_at' => $this->created_at,
        ];
    }
}
