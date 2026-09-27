<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CircularResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'title' => $this->title,
            'body' => $this->body,
            'audience' => $this->audience?->value,
            'class_room_id' => $this->class_room_id,
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'section_id' => $this->section_id,
            'section' => SectionResource::make($this->whenLoaded('section')),
            'status' => $this->status?->value,
            'published_at' => $this->published_at,
            'expires_on' => $this->expires_on,
            'attachment_path' => $this->attachment_path,
            'created_by' => $this->created_by,
            'author' => UserResource::make($this->whenLoaded('createdBy')),
            'created_at' => $this->created_at,
        ];
    }
}
