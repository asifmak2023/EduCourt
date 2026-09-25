<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdmissionDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'admission_id' => $this->admission_id,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'title' => $this->title,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'uploaded_by' => $this->whenLoaded('uploadedBy', fn () => $this->uploadedBy?->name),
            'download_url' => url("/api/v1/admissions/{$this->admission_id}/documents/{$this->id}/download"),
            'created_at' => $this->created_at,
        ];
    }
}
