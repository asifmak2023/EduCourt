<?php

namespace App\Models;

use App\Enums\ApprovalActionType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalRequestAction extends Model
{
    use HasFactory;

    protected $fillable = [
        'approval_request_id', 'sequence', 'user_id', 'action', 'comment', 'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'action' => ApprovalActionType::class,
            'acted_at' => 'datetime',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
