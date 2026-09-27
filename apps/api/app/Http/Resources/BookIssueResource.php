<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookIssueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'book_id' => $this->book_id,
            'book' => BookResource::make($this->whenLoaded('book')),
            'member_type' => $this->member_type,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'user_id' => $this->user_id,
            'issued_on' => $this->issued_on,
            'due_on' => $this->due_on,
            'returned_on' => $this->returned_on,
            'fine_amount' => (float) $this->fine_amount,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'issued_by' => $this->issued_by,
            'created_at' => $this->created_at,
        ];
    }
}
