<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassBookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'academic_year_id' => $this->academic_year_id,
            'class_room_id' => $this->class_room_id,
            'subject_id' => $this->subject_id,
            'title' => $this->title,
            'author' => $this->author,
            'publisher' => $this->publisher,
            'isbn' => $this->isbn,
            'edition' => $this->edition,
            'price' => $this->price,
            'is_required' => $this->is_required,
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'created_at' => $this->created_at,
        ];
    }
}
