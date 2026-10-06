<?php

namespace App\Enums;

enum PaymentVoucherStatus: string
{
    case Draft = 'draft';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case Partial = 'partial';
    case Paid = 'paid';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::PendingApproval => 'Pending Approval',
            self::Approved => 'Approved',
            self::Partial => 'Partially Paid',
            self::Paid => 'Paid',
            self::Cancelled => 'Cancelled',
        };
    }
}
