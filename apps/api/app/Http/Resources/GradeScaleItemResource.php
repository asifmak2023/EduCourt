<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GradeScaleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'grade_scale_id' => $this->grade_scale_id,
            'sequence' => $this->sequence,
            'grade' => $this->grade,
            'min_percentage' => $this->min_percentage,
            'max_percentage' => $this->max_percentage,
            'points' => $this->points,
            'remark' => $this->remark,
        ];
    }
}
