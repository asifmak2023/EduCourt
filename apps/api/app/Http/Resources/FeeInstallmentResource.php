<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeInstallmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sequence' => $this->sequence,
            'label' => $this->label,
            'due_date' => $this->due_date?->toDateString(),
            'percentage' => $this->percentage,
        ];
    }
}
