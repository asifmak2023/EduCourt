<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'credit_hours' => $this->credit_hours,
            'weekly_periods' => $this->weekly_periods,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
