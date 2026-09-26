<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamPaperResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'exam_id' => $this->exam_id,
            'class_room_id' => $this->class_room_id,
            'subject_id' => $this->subject_id,
            'room_id' => $this->room_id,
            'exam_date' => $this->exam_date?->toDateString(),
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'max_marks' => $this->max_marks,
            'pass_marks' => $this->pass_marks,
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'subject' => SubjectResource::make($this->whenLoaded('subject')),
            'room' => RoomResource::make($this->whenLoaded('room')),
            'duties' => InvigilationDutyResource::collection($this->whenLoaded('duties')),
            'created_at' => $this->created_at,
        ];
    }
}
