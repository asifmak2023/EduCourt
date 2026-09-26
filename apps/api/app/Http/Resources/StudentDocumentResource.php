<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'issued_on' => $this->issued_on?->toDateString(),
            'expires_on' => $this->expires_on?->toDateString(),
            'is_verified' => (bool) $this->is_verified,
            'verified_by' => $this->whenLoaded('verifiedBy', fn () => $this->verifiedBy?->name),
            'verified_at' => $this->verified_at,
            'notes' => $this->notes,
            'uploaded_by' => $this->whenLoaded('uploadedBy', fn () => $this->uploadedBy?->name),
            'download_url' => url("/api/v1/students/{$this->student_id}/documents/{$this->id}/download"),
            'created_at' => $this->created_at,
        ];
    }
}
