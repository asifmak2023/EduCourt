<?php

use App\Models\Expense;
use App\Models\FeeRefund;
use App\Models\OtherIncome;
use App\Models\PaymentVoucher;
use App\Models\PayrollRun;
use App\Models\TaxReturn;

return [

    /*
    |--------------------------------------------------------------------------
    | Approvable entities
    |--------------------------------------------------------------------------
    |
    | Maps the public entity key accepted by the approvals API to the model it
    | governs. A workflow row targets one of these keys. Financial modules
    | consult ApprovalService to decide whether an operation needs approval.
    |
    */

    'entities' => [
        'expense' => Expense::class,
        'fee_refund' => FeeRefund::class,
        'other_income' => OtherIncome::class,
        'tax_return' => TaxReturn::class,
        'payroll_run' => PayrollRun::class,
        'payment_voucher' => PaymentVoucher::class,
    ],

];
