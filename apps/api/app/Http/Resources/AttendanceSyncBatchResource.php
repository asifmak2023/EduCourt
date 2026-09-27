<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceSyncBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'user_id' => $this->user_id,
            'client_batch_uuid' => $this->client_batch_uuid,
            'device_id' => $this->device_id,
            'total_records' => $this->total_records,
            'applied_count' => $this->applied_count,
            'duplicate_count' => $this->duplicate_count,
            'conflict_count' => $this->conflict_count,
            'synced_at' => $this->synced_at,
            'created_at' => $this->created_at,
        ];
    }
}
