<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PeriodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'sequence' => $this->sequence,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'is_break' => $this->is_break,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
