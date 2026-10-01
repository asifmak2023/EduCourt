<?php

namespace Database\Seeders\Uat;

use App\Models\AcademicYear;
use App\Models\ChartOfAccount;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\Section;
use App\Models\StaffMember;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\StudentWallet;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Mutable per-campus registry passed between the UAT domain seeders. Each
 * seeder reads what it needs and registers the records it creates so later
 * seeders can cross-link to them.
 */
class UatCampusContext
{
    public Institution $institution;

    public Campus $campus;

    public ?User $platformAdmin = null;

    public ?User $campusAdmin = null;

    /** @var array<string, User> role => user */
    public array $users = [];

    /** @var array<int, User> */
    public array $teachers = [];

    public ?AcademicYear $year = null;

    /** @var array<int, Term> */
    public array $terms = [];

    /** @var array<int, \App\Models\Stage> */
    public array $stages = [];

    /** @var array<string, ClassRoom> code => class */
    public array $classes = [];

    /** @var array<string, array<int, Section>> classCode => sections */
    public array $sections = [];

    /** @var array<string, Subject> code => subject */
    public array $subjects = [];

    /** @var array<int, Student> */
    public array $students = [];

    /** @var array<int, \App\Models\Guardian> */
    public array $guardians = [];

    /** @var array<string, User> admissionNo => student user */
    public array $studentUsers = [];

    /** @var array<int, StaffMember> */
    public array $staff = [];

    /** @var array<int, StaffMember> user_id => staff member */
    public array $staffByUser = [];

    /** @var array<int, StudentEnrollment> student_id => enrollment */
    public array $enrollments = [];

    /** @var array<int, StudentWallet> student_id => wallet */
    public array $wallets = [];

    /** @var Collection<string, ChartOfAccount>|null */
    public ?Collection $accounts = null;

    public ?FiscalYear $fiscalYear = null;

    /** @var array<int, \App\Models\FeePlan> class_id => fee plan */
    public array $feePlans = [];

    /** @var array<int, \App\Models\FeeVoucher> student_id => latest voucher */
    public array $vouchers = [];

    public function __construct(Institution $institution, Campus $campus)
    {
        $this->institution = $institution;
        $this->campus = $campus;
    }

    public function role(string $role): ?User
    {
        return $this->users[$role] ?? null;
    }

    public function teacher(int $index = 0): ?User
    {
        return $this->teachers[$index] ?? ($this->teachers[0] ?? null);
    }

    /**
     * @return array<int, Section>
     */
    public function sectionsFor(string $classCode): array
    {
        return $this->sections[$classCode] ?? [];
    }

    public function campusCode(): string
    {
        return (string) $this->campus->code;
    }
}
