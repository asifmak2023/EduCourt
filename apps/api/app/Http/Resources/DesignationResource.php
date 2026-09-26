<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DesignationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'department_id' => $this->department_id,
            'name' => $this->name,
            'code' => $this->code,
            'grade' => $this->grade,
            'job_description' => $this->job_description,
            'responsibilities' => $this->responsibilities ?? [],
            'is_active' => (bool) $this->is_active,
            'department' => DepartmentResource::make($this->whenLoaded('department')),
            'created_at' => $this->created_at,
        ];
    }
}
