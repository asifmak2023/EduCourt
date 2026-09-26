<?php

namespace App\Enums;

enum WalletTransactionType: string
{
    case TopUp = 'top_up';
    case Purchase = 'purchase';
    case Refund = 'refund';
    case Adjustment = 'adjustment';
}
