<?php

namespace App\Models;

use App\Enums\PayeeType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentVoucherCategory;
use App\Enums\PaymentVoucherStatus;
use App\Enums\UtilityType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PaymentVoucher extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'fiscal_year_id', 'category', 'voucher_no',
        'payment_date', 'due_date', 'payee_type', 'staff_member_id', 'payroll_run_id',
        'payslip_id', 'vendor_id', 'payee_name', 'description', 'reference_no',
        'bill_no', 'invoice_date', 'period_year', 'period_month', 'utility_type',
        'consumer_no', 'bill_amount', 'late_fee', 'discount_amount', 'subtotal',
        'tax_amount', 'other_charges', 'total_amount', 'paid_amount', 'method',
        'cheque_no', 'remarks', 'expense_account_id', 'payable_account_id', 'status',
        'journal_entry_id', 'prepared_by', 'approved_by', 'approved_at',
        'cancelled_by', 'cancelled_at', 'cancel_reason', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'category' => PaymentVoucherCategory::class,
            'payee_type' => PayeeType::class,
            'utility_type' => UtilityType::class,
            'method' => PaymentMethod::class,
            'status' => PaymentVoucherStatus::class,
            'payment_date' => 'date',
            'due_date' => 'date',
            'invoice_date' => 'date',
            'period_year' => 'integer',
            'period_month' => 'integer',
            'bill_amount' => 'decimal:2',
            'late_fee' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'approved_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'expense_account_id');
    }

    public function payableAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'payable_account_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PaymentVoucherItem::class)->orderBy('line_no');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PaymentVoucherPayment::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function preparedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function outstanding(): float
    {
        return round((float) $this->total_amount - (float) $this->paid_amount, 2);
    }

    public function isOverdue(): bool
    {
        return $this->due_date !== null
            && in_array($this->status, [PaymentVoucherStatus::Approved, PaymentVoucherStatus::Partial], true)
            && $this->due_date->lt(today());
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
