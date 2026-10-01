<?php

namespace Database\Seeders\Uat;

use App\Enums\BankAccountType;
use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Enums\ConcessionStatus;
use App\Enums\ConcessionType;
use App\Enums\DepreciationMethod;
use App\Enums\DiscountType;
use App\Enums\ExpenseStatus;
use App\Enums\FineCategory;
use App\Enums\FineStatus;
use App\Enums\IncomeCategory;
use App\Enums\IncomeStatus;
use App\Enums\JournalStatus;
use App\Enums\LateFeeType;
use App\Enums\LiabilityStatus;
use App\Enums\LiabilityType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentIntentStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayrollAdjustmentType;
use App\Enums\PayrollRunStatus;
use App\Enums\ReconciliationStatus;
use App\Enums\RefundStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\SalaryComponentType;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Enums\TaxAppliesTo;
use App\Enums\TaxReturnStatus;
use App\Enums\TaxType;
use App\Enums\VoucherStatus;
use App\Models\AccountingPeriod;
use App\Models\Asset;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\ChartOfAccount;
use App\Models\Concession;
use App\Models\ConcessionPolicy;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseLine;
use App\Models\ExpensePayment;
use App\Models\FeeHead;
use App\Models\FeeInstallment;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeePlanItem;
use App\Models\FeeReminder;
use App\Models\FeeRefund;
use App\Models\FeeVoucher;
use App\Models\FeeVoucherLine;
use App\Models\FiscalYear;
use App\Models\FineRule;
use App\Models\IncomeSource;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Liability;
use App\Models\OtherIncome;
use App\Models\PaymentIntent;
use App\Models\PayrollAdjustment;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\Scholarship;
use App\Models\ScholarshipAward;
use App\Models\StaffSalary;
use App\Models\TaxReturn;
use App\Models\TaxReturnDocument;
use App\Models\TaxRule;
use App\Models\Vendor;
use App\Services\Accounting\DefaultChartOfAccounts;
use Carbon\CarbonImmutable;

/**
 * Seeds the complete finance domain for a campus: chart of accounts, fiscal
 * year, fee structures, billing, payments, refunds, online payment intents,
 * scholarships, concessions, fines, reminders, budgets, expenses, banking,
 * assets, liabilities, other income, tax and payroll.
 */
class UatFinanceSeeder extends UatSeederBase
{
    protected const INSTALLMENTS = [40, 30, 30];

    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 7000);

        $this->fiscalYearAndAccounts($ctx);
        $this->accountingPeriods($ctx);
        $this->chartLinks($ctx);
        $this->scholarshipsAndConcessions($ctx);
        $this->feeStructureAndBilling($ctx);
        $this->refunds($ctx);
        $this->fines($ctx);
        $this->reminders($ctx);
        $this->budgets($ctx);
        $this->expenses($ctx);
        $this->banking($ctx);
        $this->assetsAndLiabilities($ctx);
        $this->otherIncomes($ctx);
        $this->tax($ctx);
        $this->journals($ctx);
        $this->payroll($ctx);

        $this->command?->info(sprintf(
            'UAT:   %s - %d vouchers, %d payments, %d journal entries',
            $ctx->campusCode(),
            FeeVoucher::query()->where('campus_id', $ctx->campus->id)->count(),
            FeePayment::query()->where('campus_id', $ctx->campus->id)->count(),
            JournalEntry::query()->where('campus_id', $ctx->campus->id)->count()
        ));
    }

    protected function fiscalYearAndAccounts(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $ctx->fiscalYear = $this->first(FiscalYear::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'FY-2026',
        ], $tenant + [
            'name' => 'Fiscal Year 2026-2027',
            'starts_on' => '2026-07-01',
            'ends_on' => '2027-06-30',
            'status' => 'active',
            'is_current' => true,
        ]);

        $ctx->accounts = app(DefaultChartOfAccounts::class)->seed($ctx->campus);
    }

    protected function accountingPeriods(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $start = CarbonImmutable::parse('2026-07-01');

        for ($i = 0; $i < 12; $i++) {
            $from = $start->addMonths($i);
            $to = $from->endOfMonth();

            AccountingPeriod::firstOrCreate(
                [
                    'fiscal_year_id' => $ctx->fiscalYear->id,
                    'name' => $from->format('F Y'),
                ],
                $tenant + [
                    'starts_on' => $from->toDateString(),
                    'ends_on' => $to->toDateString(),
                    'status' => $i === 0 ? 'closed' : 'open',
                    'closed_at' => $i === 0 ? now() : null,
                    'closed_by' => $i === 0 ? $ctx->role('finance_head')?->id : null,
                ]
            );
        }
    }

    protected function account(UatCampusContext $ctx, string $code): ?ChartOfAccount
    {
        return $ctx->accounts?->get($code);
    }

    protected function chartLinks(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        // Fee heads mapped to income accounts.
        $heads = [
            ['TUITION', 'Tuition Fee', '4010'],
            ['ADMISSION', 'Admission Fee', '4020'],
            ['TRANSPORT', 'Transport Fee', '4030'],
            ['EXAM', 'Examination Fee', '4090'],
            ['LAB', 'Laboratory Fee', '4040'],
            ['LIBRARY', 'Library Fee', '4040'],
            ['MISC', 'Miscellaneous Charges', '4040'],
        ];
        foreach ($heads as $i => [$code, $name, $accountCode]) {
            $this->first(FeeHead::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'income_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'sort_order' => $i + 1,
                'is_active' => true,
            ]);
        }

        $this->first(FeeHead::class, ['campus_id' => $ctx->campus->id, 'code' => 'FINE'], $tenant + [
            'income_account_id' => $this->account($ctx, '4050')?->id,
            'name' => 'Fines',
            'sort_order' => 99,
            'is_active' => true,
        ]);

        // Expense categories mapped to expense accounts.
        $categories = [
            ['UTIL', 'Utilities', '5020'],
            ['SUPP', 'Teaching Supplies', '5030'],
            ['REPAIR', 'Repairs and Maintenance', '5040'],
            ['MKT', 'Marketing and Promotion', '5050'],
            ['COGS', 'Cost of Goods Sold', '5060'],
        ];
        foreach ($categories as $i => [$code, $name, $accountCode]) {
            $this->first(ExpenseCategory::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'expense_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'sort_order' => $i + 1,
                'is_active' => true,
            ]);
        }

        // Income sources.
        $sources = [
            ['DON', 'Donations', IncomeCategory::Donation, '4060'],
            ['SALE', 'Canteen Sales', IncomeCategory::Sale, '4095'],
            ['RENT', 'Facility Rental', IncomeCategory::Other, '4070'],
            ['EXAM', 'Exam Charges', IncomeCategory::ExamFee, '4090'],
        ];
        foreach ($sources as [$code, $name, $category, $accountCode]) {
            $this->first(IncomeSource::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'income_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'category' => $category,
                'is_active' => true,
            ]);
        }

        // Vendors.
        $vendors = [
            ['V-ELEC', 'K-Electric', '2010'],
            ['V-SUPP', 'Ideal Stationers', '2010'],
            ['V-MAINT', 'Reliable Maintenance Services', '2010'],
            ['V-FOOD', 'Fresh Foods Distributors', '2010'],
        ];
        foreach ($vendors as $i => [$code, $name, $accountCode]) {
            $this->first(Vendor::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'payable_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'contact_name' => $this->pick(['Ahmed Khan', 'Bilal Butt', 'Sara Malik', 'Usman Raza']),
                'phone' => $this->phone($ctx->campus, 9000 + $i),
                'email' => strtolower($code).'.vendor@'.UatFoundationSeeder::EMAIL_DOMAIN,
                'address' => $this->street($i).', '.$this->city($i),
                'is_active' => true,
            ]);
        }
    }

    protected function scholarshipsAndConcessions(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $scholarships = [
            ['Merit Scholarship', 'MERIT', ScholarshipType::Merit, ScholarshipDiscountType::Percentage, 25],
            ['Need-Based Scholarship', 'NEED', ScholarshipType::NeedBased, ScholarshipDiscountType::Fixed, 15000],
            ['Sports Scholarship', 'SPORTS', ScholarshipType::Sports, ScholarshipDiscountType::Percentage, 15],
        ];
        foreach ($scholarships as [$name, $code, $type, $discountType, $value]) {
            $scholarship = $this->first(Scholarship::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'type' => $type,
                'discount_type' => $discountType,
                'value' => $value,
                'academic_year_id' => $ctx->year->id,
                'sponsor' => $this->pick(['Trust Fund', 'Government of Pakistan', 'Alumni Association']),
                'description' => $name.' for deserving students.',
                'is_active' => true,
            ]);

            foreach ($ctx->students as $index => $student) {
                if ($index % 12 !== 0 && $index % 15 !== 0) {
                    continue;
                }

                ScholarshipAward::firstOrCreate(
                    ['scholarship_id' => $scholarship->id, 'student_id' => $student->id],
                    $tenant + [
                        'academic_year_id' => $ctx->year->id,
                        'awarded_on' => '2026-08-15',
                        'status' => ScholarshipAwardStatus::Active,
                        'approved_by' => $ctx->role('principal')?->id,
                        'notes' => 'Awarded after committee review.',
                    ]
                );

                break; // one award per scholarship is enough for the demo
            }
        }

        $policies = [
            ['Sibling Discount', 'SIB', ConcessionType::Sibling, DiscountType::Percentage, 10],
            ['Staff Ward Concession', 'STAFF', ConcessionType::StaffWard, DiscountType::Percentage, 50],
            ['Need-Based Concession', 'NEED', ConcessionType::NeedBased, DiscountType::Fixed, 8000],
        ];
        foreach ($policies as [$name, $code, $type, $discountType, $value]) {
            $policy = $this->first(ConcessionPolicy::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'academic_year_id' => $ctx->year->id,
                'name' => $name,
                'type' => $type,
                'discount_type' => $discountType,
                'value' => $value,
                'criteria' => 'Verified supporting documents required.',
                'priority' => 1,
                'is_stackable' => false,
                'requires_approval' => true,
                'is_active' => true,
            ]);

            foreach ($ctx->students as $index => $student) {
                if ($index % 20 !== 0) {
                    continue;
                }

                Concession::firstOrCreate(
                    ['student_id' => $student->id, 'academic_year_id' => $ctx->year->id, 'concession_policy_id' => $policy->id],
                    $tenant + [
                        'discount_type' => $discountType,
                        'value' => $value,
                        'amount' => $discountType === DiscountType::Fixed ? $value : 0,
                        'status' => ConcessionStatus::Approved,
                        'requested_by' => $ctx->role('accountant')?->id,
                        'approved_by' => $ctx->role('finance_head')?->id,
                        'approved_at' => now(),
                        'note' => 'Approved for the academic year.',
                    ]
                );

                break;
            }
        }
    }

    protected function feeStructureAndBilling(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $heads = FeeHead::query()->where('campus_id', $ctx->campus->id)->get()->keyBy('code');

        foreach ($ctx->classes as $class) {
            $plan = $this->first(FeePlan::class, [
                'academic_year_id' => $ctx->year->id,
                'class_room_id' => $class->id,
                'name' => 'Annual Fee Plan',
            ], $tenant + [
                'description' => 'Annual fee structure for '.$class->name,
                'is_active' => true,
                'late_fee_type' => LateFeeType::Flat,
                'late_fee_amount' => 500,
                'late_fee_grace_days' => 10,
            ]);

            $ctx->feePlans[$class->id] = $plan;

            $items = [
                ['TUITION', 48000],
                ['ADMISSION', 10000],
                ['EXAM', 6000],
                ['LAB', 4000],
                ['LIBRARY', 2000],
                ['MISC', 3000],
            ];
            foreach ($items as $i => [$code, $amount]) {
                if (! isset($heads[$code])) {
                    continue;
                }
                FeePlanItem::firstOrCreate(
                    ['fee_plan_id' => $plan->id, 'fee_head_id' => $heads[$code]->id],
                    ['amount' => $amount, 'is_optional' => false, 'sort_order' => $i + 1]
                );
            }

            foreach (self::INSTALLMENTS as $i => $percentage) {
                FeeInstallment::firstOrCreate(
                    ['fee_plan_id' => $plan->id, 'sequence' => $i + 1],
                    [
                        'label' => 'Installment '.($i + 1),
                        'due_date' => $this->day('2026-09-15', $i * 90),
                        'percentage' => $percentage,
                    ]
                );
            }

            $planTotal = (float) FeePlanItem::query()->where('fee_plan_id', $plan->id)->sum('amount');

            $this->vouchersForClass($ctx, $class, $plan, $heads, $planTotal);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<string, FeeHead>  $heads
     */
    protected function vouchersForClass(UatCampusContext $ctx, $class, FeePlan $plan, $heads, float $planTotal): void
    {
        $tenant = $this->tenant($ctx->campus);

        $installments = FeeInstallment::query()
            ->where('fee_plan_id', $plan->id)
            ->orderBy('sequence')
            ->get();

        foreach ($ctx->students as $index => $student) {
            $enrollment = $ctx->enrollments[$student->id] ?? null;
            if ($enrollment === null || $enrollment->class_room_id !== $class->id) {
                continue;
            }

            [$discountPct, $discountFixed] = $this->studentDiscount($ctx, $student, $index);

            foreach ($installments as $installment) {
                $share = $installment->percentage / 100;
                $gross = $this->decimal($planTotal * $share);
                $discount = $this->decimal(($planTotal * $discountPct / 100) * $share + $discountFixed * $share);
                $discount = min($discount, $gross);
                $amount = $this->decimal($gross - $discount);

                [$paidAmount, $status] = $this->paymentBehaviour($index, $installment->sequence, $amount);

                $voucher = $this->first(FeeVoucher::class, [
                    'student_id' => $student->id,
                    'academic_year_id' => $ctx->year->id,
                    'sequence' => $installment->sequence,
                ], $tenant + [
                    'fee_plan_id' => $plan->id,
                    'fee_installment_id' => $installment->id,
                    'voucher_no' => 'FV-'.$ctx->campusCode().'-'.sprintf('%05d', $index).'-'.$installment->sequence,
                    'due_date' => $installment->due_date,
                    'gross_amount' => $gross,
                    'discount_amount' => $discount,
                    'amount' => $amount,
                    'paid_amount' => $paidAmount,
                    'late_fee_amount' => 0,
                    'status' => $status,
                    'issued_at' => now(),
                ]);

                $ctx->vouchers[$student->id] = $voucher;
                $this->voucherLines($ctx, $voucher, $heads, $share, $discount, $index);
                $this->paymentForVoucher($ctx, $voucher, $student, $index, $installment->sequence, $paidAmount);

                if ($status === VoucherStatus::Unpaid && $installment->sequence === 1 && $index % 7 === 0) {
                    PaymentIntent::firstOrCreate(
                        ['fee_voucher_id' => $voucher->id, 'reference' => 'PI-'.$ctx->campusCode().'-'.$index],
                        $tenant + [
                            'student_id' => $student->id,
                            'gateway' => 'jazzcash',
                            'amount' => $amount,
                            'currency' => 'PKR',
                            'status' => PaymentIntentStatus::Pending,
                            'checkout_url' => 'https://sandbox.jazzcash.com.pk/checkout/'.$voucher->voucher_no,
                            'created_by' => $ctx->role('accountant')?->id,
                        ]
                    );
                }
            }
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<string, FeeHead>  $heads
     */
    protected function voucherLines(UatCampusContext $ctx, FeeVoucher $voucher, $heads, float $share, float $discount, int $index): void
    {
        $first = true;
        foreach ($heads as $head) {
            $base = match ($head->code) {
                'TUITION' => 48000,
                'ADMISSION' => 10000,
                'EXAM' => 6000,
                'LAB' => 4000,
                'LIBRARY' => 2000,
                'MISC' => 3000,
                default => 0,
            };
            if ($base === 0) {
                continue;
            }

            FeeVoucherLine::firstOrCreate(
                ['fee_voucher_id' => $voucher->id, 'fee_head_id' => $head->id],
                [
                    'amount' => $this->decimal($base * $share),
                    'discount_amount' => $first ? $discount : 0,
                ]
            );
            $first = false;
        }
    }

    protected function paymentForVoucher(UatCampusContext $ctx, FeeVoucher $voucher, $student, int $index, int $sequence, float $paidAmount): void
    {
        if ($paidAmount <= 0) {
            return;
        }

        FeePayment::firstOrCreate(
            ['receipt_no' => 'RCP-'.$ctx->campusCode().'-'.sprintf('%05d', $index).'-'.$sequence],
            $this->tenant($ctx->campus) + [
                'student_id' => $student->id,
                'fee_voucher_id' => $voucher->id,
                'payment_date' => $this->day('2026-09-10', $index % 20),
                'amount' => $paidAmount,
                'method' => $this->pick([PaymentMethod::Cash, PaymentMethod::BankTransfer, PaymentMethod::Online]),
                'reference' => 'TXN-'.sprintf('%08d', $index * 10 + $sequence),
                'status' => 'posted',
                'created_by' => $ctx->role('accountant')?->id,
            ]
        );
    }

    /**
     * @return array{0: float, 1: float} [percentage discount, fixed discount]
     */
    protected function studentDiscount(UatCampusContext $ctx, $student, int $index): array
    {
        $pct = 0.0;
        $fixed = 0.0;

        if ($index % 12 === 0) {
            $pct += 25;
        }
        if ($index % 15 === 0) {
            $fixed += 15000;
        }
        if ($index % 20 === 0) {
            $pct += 10;
        }

        return [$pct, $fixed];
    }

    /**
     * @return array{0: float, 1: VoucherStatus}
     */
    protected function paymentBehaviour(int $index, int $sequence, float $amount): array
    {
        $behaviour = $index % 5;

        return match (true) {
            in_array($behaviour, [0, 1], true) => [$amount, VoucherStatus::Paid],
            $behaviour === 2 && $sequence === 1 => [$amount, VoucherStatus::Paid],
            $behaviour === 3 && $sequence === 1 => [$this->decimal($amount / 2), VoucherStatus::Partial],
            default => [0.0, VoucherStatus::Unpaid],
        };
    }

    protected function refunds(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $payments = FeePayment::query()
            ->where('campus_id', $ctx->campus->id)
            ->orderBy('id')
            ->limit(4)
            ->get();

        foreach ($payments as $i => $payment) {
            FeeRefund::firstOrCreate(
                ['receipt_no' => 'RFD-'.$ctx->campusCode().'-'.sprintf('%04d', $i)],
                $tenant + [
                    'student_id' => $payment->student_id,
                    'fee_payment_id' => $payment->id,
                    'refund_date' => $this->day('2026-10-05', $i),
                    'amount' => $this->decimal($payment->amount * 0.10),
                    'method' => PaymentMethod::BankTransfer,
                    'reason' => 'Excess fee payment refunded.',
                    'status' => PaymentStatus::Posted,
                    'approval_status' => RefundStatus::Approved,
                    'requested_by' => $ctx->role('accountant')?->id,
                    'approved_by' => $ctx->role('finance_head')?->id,
                    'approved_at' => now(),
                ]
            );
        }
    }

    protected function fines(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $fineHead = FeeHead::query()->where('campus_id', $ctx->campus->id)->where('code', 'FINE')->first();

        $rules = [
            ['Library Late Return', 'LIB-LATE', FineCategory::Library, 200],
            ['Lab Equipment Damage', 'LAB-DMG', FineCategory::Lab, 1000],
            ['Discipline Violation', 'DISC', FineCategory::Discipline, 500],
        ];

        foreach ($rules as [$name, $code, $category, $amount]) {
            $rule = $this->first(FineRule::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'fee_head_id' => $fineHead?->id,
                'name' => $name,
                'category' => $category,
                'amount' => $amount,
                'is_active' => true,
                'description' => $name.' fine.',
            ]);

            foreach ($ctx->students as $index => $student) {
                if ($index % 25 !== 0) {
                    continue;
                }

                \App\Models\StudentFine::firstOrCreate(
                    ['student_id' => $student->id, 'fine_rule_id' => $rule->id, 'issued_on' => '2026-10-01'],
                    $tenant + [
                        'academic_year_id' => $ctx->year->id,
                        'amount' => $amount,
                        'reason' => $name,
                        'status' => $index % 50 === 0 ? FineStatus::Applied : FineStatus::Pending,
                        'issued_on' => '2026-10-01',
                        'created_by' => $ctx->role('accountant')?->id,
                    ]
                );

                break;
            }
        }
    }

    protected function reminders(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $vouchers = FeeVoucher::query()
            ->where('campus_id', $ctx->campus->id)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->orderBy('due_date')
            ->limit(20)
            ->get();

        foreach ($vouchers as $voucher) {
            $student = $ctx->students[$voucher->student_id - ($ctx->students[0]->id ?? 0)] ?? null;
            $guardian = null;
            foreach ($ctx->guardians as $g) {
                if ($g->user_id !== null) {
                    $guardian = $g;
                    break;
                }
            }

            $outstanding = (float) $voucher->amount - (float) $voucher->paid_amount;
            if ($outstanding <= 0) {
                continue;
            }

            FeeReminder::firstOrCreate(
                ['student_id' => $voucher->student_id, 'academic_year_id' => $ctx->year->id, 'bucket' => 'overdue'],
                $tenant + [
                    'guardian_id' => $guardian?->id,
                    'channel' => ReminderChannel::Email,
                    'recipient_name' => $guardian?->name,
                    'recipient_email' => $guardian?->email,
                    'recipient_phone' => $guardian?->phone,
                    'outstanding' => $outstanding,
                    'oldest_due_date' => $voucher->due_date,
                    'days_overdue' => 20,
                    'message' => 'Your fee payment is overdue. Kindly clear the outstanding balance.',
                    'status' => ReminderStatus::Sent,
                    'sent_at' => now(),
                    'created_by' => $ctx->role('accountant')?->id,
                ]
            );
        }
    }

    protected function budgets(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $budget = $this->first(Budget::class, [
            'fiscal_year_id' => $ctx->fiscalYear->id,
            'name' => 'Annual Operating Budget 2026-2027',
        ], $tenant + [
            'period_type' => BudgetPeriodType::Annual,
            'starts_on' => '2026-07-01',
            'ends_on' => '2027-06-30',
            'status' => BudgetStatus::Approved,
            'created_by' => $ctx->role('finance_head')?->id,
            'approved_by' => $ctx->role('principal')?->id,
            'approved_at' => now(),
        ]);

        $lines = [
            ['5010', 9000000, 'Salaries and wages'],
            ['5020', 1500000, 'Utilities'],
            ['5030', 800000, 'Teaching supplies'],
            ['5040', 700000, 'Repairs and maintenance'],
            ['5050', 500000, 'Marketing'],
        ];
        foreach ($lines as [$code, $amount, $notes]) {
            BudgetLine::firstOrCreate(
                ['budget_id' => $budget->id, 'chart_of_account_id' => $this->account($ctx, $code)?->id],
                $tenant + ['amount' => $amount, 'notes' => $notes]
            );
        }
    }

    protected function expenses(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $categories = ExpenseCategory::query()->where('campus_id', $ctx->campus->id)->get()->keyBy('code');
        $vendors = Vendor::query()->where('campus_id', $ctx->campus->id)->get();

        $definitions = [
            ['UTIL', 0, 'Electricity bill for the month'],
            ['SUPP', 1, 'Stationery and teaching supplies'],
            ['REPAIR', 2, 'Classroom furniture repairs'],
            ['MKT', 3, 'Admission campaign marketing'],
            ['COGS', 3, 'Canteen food supplies'],
            ['UTIL', 0, 'Water and internet charges'],
        ];

        foreach ($definitions as $i => [$code, $vendorIndex, $memo]) {
            $category = $categories[$code] ?? null;
            if ($category === null) {
                continue;
            }
            $amount = [250000, 120000, 85000, 60000, 180000, 95000][$i];

            $expense = $this->first(Expense::class, [
                'campus_id' => $ctx->campus->id,
                'reference' => 'EXP-'.$ctx->campusCode().'-'.sprintf('%04d', $i + 1),
            ], $tenant + [
                'fiscal_year_id' => $ctx->fiscalYear->id,
                'vendor_id' => $vendors[$vendorIndex]->id ?? null,
                'expense_date' => $this->day('2026-08-05', $i * 15),
                'status' => $i % 3 === 0 ? ExpenseStatus::Paid : ExpenseStatus::Approved,
                'payee_name' => $vendors[$vendorIndex]->name ?? 'Walk-in Vendor',
                'bill_no' => 'BILL-'.sprintf('%05d', $i + 1),
                'memo' => $memo,
                'total' => $amount,
                'paid_amount' => $i % 3 === 0 ? $amount : 0,
                'created_by' => $ctx->role('accountant')?->id,
                'approved_by' => $ctx->role('finance_head')?->id,
                'approved_at' => now(),
            ]);

            ExpenseLine::firstOrCreate(
                ['expense_id' => $expense->id, 'expense_category_id' => $category->id],
                ['amount' => $amount, 'description' => $memo]
            );

            if ($i % 3 === 0) {
                ExpensePayment::firstOrCreate(
                    ['reference' => 'EXPP-'.$ctx->campusCode().'-'.sprintf('%04d', $i + 1)],
                    $tenant + [
                        'expense_id' => $expense->id,
                        'payment_date' => $this->day('2026-08-10', $i * 15),
                        'amount' => $amount,
                        'method' => PaymentMethod::BankTransfer,
                        'created_by' => $ctx->role('accountant')?->id,
                    ]
                );
            }
        }
    }

    protected function banking(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $accounts = [
            ['BANK-01', 'Main Bank Account', BankAccountType::Bank, '1020', 'PK36MEZN000123456789', 'Meezan Bank', 'Main Branch'],
            ['CASH-01', 'Petty Cash', BankAccountType::PettyCash, '1010', null, null, null],
        ];

        foreach ($accounts as [$code, $name, $type, $accountCode, $accountNo, $bankName, $branch]) {
            $account = $this->first(BankAccount::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'chart_of_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'type' => $type,
                'account_no' => $accountNo,
                'bank_name' => $bankName,
                'branch' => $branch,
                'currency' => 'PKR',
                'opening_balance' => $code === 'BANK-01' ? 5000000 : 100000,
                'is_active' => true,
            ]);

            if ($code === 'BANK-01') {
                BankReconciliation::firstOrCreate(
                    ['bank_account_id' => $account->id, 'statement_date' => '2026-09-30'],
                    $tenant + [
                        'opening_balance' => 5000000,
                        'book_balance' => 4850000,
                        'statement_closing_balance' => 4845000,
                        'difference' => 5000,
                        'status' => ReconciliationStatus::Completed,
                        'reconciled_by' => $ctx->role('accountant')?->id,
                        'reconciled_at' => now(),
                    ]
                );
            }
        }
    }

    protected function assetsAndLiabilities(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $assets = [
            ['FA-001', 'School Bus (Toyota Coaster)', '1310', 8500000, '2024-05-01'],
            ['FA-002', 'Computer Lab PCs (25 units)', '1320', 2500000, '2025-01-15'],
            ['FA-003', 'Classroom Furniture', '1310', 1800000, '2024-08-01'],
            ['FA-004', 'Science Lab Equipment', '1320', 950000, '2025-03-10'],
        ];
        foreach ($assets as [$code, $name, $accountCode, $cost, $date]) {
            $this->first(Asset::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'chart_of_account_id' => $this->account($ctx, $accountCode)?->id,
                'name' => $name,
                'category' => 'Fixed Asset',
                'acquisition_date' => $date,
                'acquisition_cost' => $cost,
                'salvage_value' => $this->decimal($cost * 0.05),
                'useful_life_months' => 60,
                'depreciation_method' => DepreciationMethod::StraightLine,
                'status' => \App\Enums\AssetStatus::Active,
            ]);
        }

        $liabilities = [
            ['LIA-001', 'Bank Loan - Campus Expansion', LiabilityType::Loan, 10000000, 8.5, '20000000'],
            ['LIA-002', 'Vendor Payable - Construction', LiabilityType::Payable, 1500000, null, '1500000'],
        ];
        foreach ($liabilities as [$code, $name, $type, $principal, $rate, $outstanding]) {
            $this->first(Liability::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'chart_of_account_id' => $this->account($ctx, '2110')?->id,
                'name' => $name,
                'type' => $type,
                'lender' => $this->pick(['Meezan Bank', 'Bank Alfalah', 'Habib Bank Limited']),
                'principal_amount' => $principal,
                'interest_rate' => $rate,
                'starts_on' => '2025-01-01',
                'matures_on' => '2030-01-01',
                'installment_amount' => 250000,
                'outstanding_amount' => $outstanding,
                'status' => LiabilityStatus::Active,
            ]);
        }
    }

    protected function otherIncomes(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $sources = IncomeSource::query()->where('campus_id', $ctx->campus->id)->get()->keyBy('code');
        $definitions = [
            ['DON', 500000, 'Donation from alumni association'],
            ['SALE', 85000, 'Canteen sales share'],
            ['RENT', 120000, 'Auditorium rental income'],
            ['EXAM', 65000, 'Re-checking fee collection'],
        ];

        foreach ($definitions as $i => [$code, $amount, $remarks]) {
            $source = $sources[$code] ?? null;
            if ($source === null) {
                continue;
            }

            OtherIncome::firstOrCreate(
                ['receipt_no' => 'OI-'.$ctx->campusCode().'-'.sprintf('%04d', $i + 1)],
                $tenant + [
                    'fiscal_year_id' => $ctx->fiscalYear->id,
                    'income_source_id' => $source->id,
                    'created_by' => $ctx->role('accountant')?->id,
                    'received_on' => $this->day('2026-08-01', $i * 20),
                    'amount' => $amount,
                    'method' => 'bank_transfer',
                    'payer_name' => $this->pick(['Alumni Association', 'Walk-in Customer', 'Local Community']),
                    'reference' => 'OIREf-'.($i + 1),
                    'remarks' => $remarks,
                    'status' => IncomeStatus::Posted,
                ]
            );
        }
    }

    protected function tax(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $rules = [
            ['Sales Tax', 'ST-17', TaxType::SalesTax, TaxAppliesTo::All, 17],
            ['Withholding Tax', 'WHT-5', TaxType::Withholding, TaxAppliesTo::Expense, 5],
        ];

        foreach ($rules as [$name, $code, $type, $appliesTo, $rate]) {
            $rule = $this->first(TaxRule::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'tax_account_id' => $this->account($ctx, '2140')?->id,
                'name' => $name,
                'type' => $type,
                'applies_to' => $appliesTo,
                'rate' => $rate,
                'effective_from' => '2026-07-01',
                'is_active' => true,
                'description' => $name.' at '.$rate.'%.',
            ]);

            if ($code !== 'ST-17') {
                continue;
            }

            $return = $this->first(TaxReturn::class, [
                'tax_rule_id' => $rule->id,
                'period_start' => '2026-07-01',
                'period_end' => '2026-07-31',
            ], $tenant + [
                'fiscal_year_id' => $ctx->fiscalYear->id,
                'due_date' => '2026-08-15',
                'taxable_amount' => 1500000,
                'tax_amount' => $this->decimal(1500000 * $rate / 100),
                'status' => TaxReturnStatus::Filed,
                'reference' => 'TAX-'.'2026-07',
                'filed_at' => now(),
            ]);

            TaxReturnDocument::firstOrCreate(
                ['tax_return_id' => $return->id, 'name' => 'Sales Tax Return (July 2026)'],
                [
                    'uploaded_by' => $ctx->role('finance_head')?->id,
                    'file_path' => 'uat/tax/'.$return->id.'.pdf',
                    'is_required' => true,
                    'uploaded_at' => now(),
                ]
            );
        }
    }

    protected function journals(UatCampusContext $ctx): void
    {
        $entries = [
            ['JV-OPEN', '2026-07-01', 'Opening balances for the fiscal year', [
                ['1010', 100000, 0],
                ['1020', 5000000, 0],
                ['3010', 0, 5100000],
            ]],
            ['JV-FEE', '2026-09-15', 'Fee collection for first installment', [
                ['1010', 2500000, 0],
                ['4010', 0, 2500000],
            ]],
            ['JV-SAL', '2026-09-30', 'September payroll disbursement', [
                ['5010', 1800000, 0],
                ['1010', 0, 1800000],
            ]],
            ['JV-EXP', '2026-08-10', 'Utility expenses paid', [
                ['5020', 250000, 0],
                ['1020', 0, 250000],
            ]],
        ];

        foreach ($entries as [$code, $date, $memo, $lines]) {
            $debited = array_sum(array_map(fn ($l) => $l[1], $lines));
            $credited = array_sum(array_map(fn ($l) => $l[2], $lines));

            $entry = $this->first(JournalEntry::class, [
                'campus_id' => $ctx->campus->id,
                'reference' => 'JV/'.$ctx->campusCode().'/'.$code,
            ], $this->tenant($ctx->campus) + [
                'fiscal_year_id' => $ctx->fiscalYear->id,
                'entry_date' => $date,
                'status' => JournalStatus::Posted,
                'memo' => $memo,
                'total_debit' => $debited,
                'total_credit' => $credited,
                'posted_at' => now(),
                'posted_by' => $ctx->role('finance_head')?->id,
            ]);

            foreach ($lines as $i => [$accountCode, $debit, $credit]) {
                $account = $this->account($ctx, $accountCode);
                if ($account === null) {
                    continue;
                }

                JournalLine::firstOrCreate(
                    ['journal_entry_id' => $entry->id, 'line_no' => $i + 1],
                    [
                        'chart_of_account_id' => $account->id,
                        'description' => $memo,
                        'debit' => $debit,
                        'credit' => $credit,
                    ]
                );
            }
        }
    }

    protected function payroll(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $period = '2026-09';

        foreach ($ctx->staff as $i => $staff) {
            if ($i % 7 !== 0) {
                continue;
            }

            PayrollAdjustment::firstOrCreate(
                ['staff_member_id' => $staff->id, 'period' => $period, 'type' => PayrollAdjustmentType::Bonus->value],
                $tenant + [
                    'amount' => 10000,
                    'reason' => 'Performance bonus.',
                    'is_applied' => true,
                    'created_by' => $ctx->role('hr_officer')?->id,
                ]
            );
        }

        $run = $this->first(PayrollRun::class, [
            'campus_id' => $ctx->campus->id,
            'period' => $period,
        ], $tenant + [
            'fiscal_year_id' => $ctx->fiscalYear->id,
            'status' => PayrollRunStatus::Paid,
            'total_gross' => 0,
            'total_deductions' => 0,
            'total_net' => 0,
            'generated_by' => $ctx->role('hr_officer')?->id,
            'approved_by' => $ctx->role('finance_head')?->id,
            'approved_at' => now(),
            'payment_method' => 'bank_transfer',
            'paid_at' => now(),
        ]);

        $totalGross = 0.0;
        $totalDeductions = 0.0;
        $totalNet = 0.0;

        foreach ($ctx->staff as $staff) {
            $salary = StaffSalary::query()->where('staff_member_id', $staff->id)->where('is_active', true)->first();
            if ($salary === null) {
                continue;
            }

            $items = \App\Models\StaffSalaryItem::query()
                ->where('staff_salary_id', $salary->id)
                ->with('component')
                ->get();

            $gross = 0.0;
            $deductions = 0.0;

            $payslip = Payslip::firstOrCreate(
                ['payroll_run_id' => $run->id, 'staff_member_id' => $staff->id],
                $tenant + [
                    'staff_salary_id' => $salary->id,
                    'basic' => $salary->basic_salary,
                    'gross' => 0,
                    'deductions' => 0,
                    'net' => 0,
                    'working_days' => 26,
                    'present_days' => 25,
                ]
            );

            foreach ($items as $item) {
                $component = $item->component;
                if ($component === null) {
                    continue;
                }

                $amount = (float) ($item->amount ?? 0);
                $type = $component->type;

                PayslipItem::firstOrCreate(
                    ['payslip_id' => $payslip->id, 'label' => $component->name],
                    [
                        'type' => $type,
                        'amount' => $amount,
                        'source' => 'component',
                        'salary_component_id' => $component->id,
                    ]
                );

                if ($type === SalaryComponentType::Earning) {
                    $gross += $amount;
                } else {
                    $deductions += $amount;
                }
            }

            $net = $this->decimal($gross - $deductions);
            $payslip->forceFill([
                'gross' => $gross,
                'deductions' => $deductions,
                'net' => $net,
            ])->save();

            $totalGross += $gross;
            $totalDeductions += $deductions;
            $totalNet += $net;
        }

        $run->forceFill([
            'total_gross' => $this->decimal($totalGross),
            'total_deductions' => $this->decimal($totalDeductions),
            'total_net' => $this->decimal($totalNet),
        ])->save();
    }
}
