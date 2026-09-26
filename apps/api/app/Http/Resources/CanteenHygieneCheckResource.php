<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CanteenHygieneCheckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'check_date' => $this->check_date?->toDateString(),
            'area' => $this->area,
            'status' => $this->status?->value,
            'score' => $this->score,
            'remarks' => $this->remarks,
            'checked_by' => $this->checked_by,
            'created_at' => $this->created_at,
        ];
    }
}
