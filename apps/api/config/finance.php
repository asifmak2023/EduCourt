<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default posting accounts
    |--------------------------------------------------------------------------
    |
    | Account codes resolved within the active campus when posting fee
    | vouchers and receipts. Each campus chart of accounts is expected to
    | include these codes (the default chart seeder provides them).
    |
    */

    'accounts' => [
        'receivable' => '1110',
        'cash' => '1010',
        'bank' => '1020',
        'advance' => '2030',
        'late_fee_income' => '4050',
        'other_income' => '4040',
        'vendor_payable' => '2010',
        'tax_payable' => '2140',
        'withholding_tax_payable' => '2150',
    ],

];
