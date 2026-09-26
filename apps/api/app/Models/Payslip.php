<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payslip extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'payroll_run_id', 'staff_member_id',
        'staff_salary_id', 'basic', 'gross', 'deductions', 'net',
        'working_days', 'present_days', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'basic' => 'decimal:2',
            'gross' => 'decimal:2',
            'deductions' => 'decimal:2',
            'net' => 'decimal:2',
            'working_days' => 'integer',
            'present_days' => 'integer',
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

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }

    public function staffSalary(): BelongsTo
    {
        return $this->belongsTo(StaffSalary::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayslipItem::class);
    }
}
