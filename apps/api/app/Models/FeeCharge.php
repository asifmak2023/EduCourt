<?php

namespace App\Models;

use App\Enums\BillingKind;
use App\Enums\ExamTerm;
use App\Enums\VoucherStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class FeeCharge extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'academic_year_id', 'student_id',
        'enrollment_id', 'class_room_id', 'section_id', 'fee_structure_item_id',
        'fee_head_id', 'voucher_no', 'billing_kind', 'exam_term', 'period_year',
        'period_month', 'title', 'amount', 'discount_amount', 'paid_amount',
        'due_date', 'status', 'source', 'notes', 'journal_entry_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'billing_kind' => BillingKind::class,
            'exam_term' => ExamTerm::class,
            'period_year' => 'integer',
            'period_month' => 'integer',
            'amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'due_date' => 'date',
            'status' => VoucherStatus::class,
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

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class, 'enrollment_id');
    }

    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function structureItem(): BelongsTo
    {
        return $this->belongsTo(FeeStructureItem::class, 'fee_structure_item_id');
    }

    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(FeeChargeLine::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(FeeReceiptAllocation::class);
    }

    public function receipts(): HasManyThrough
    {
        return $this->hasManyThrough(
            FeeReceipt::class,
            FeeReceiptAllocation::class,
            'fee_charge_id',
            'id',
            'id',
            'fee_receipt_id'
        );
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function balance(): float
    {
        return max(round((float) $this->amount - (float) $this->paid_amount, 2), 0.0);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
