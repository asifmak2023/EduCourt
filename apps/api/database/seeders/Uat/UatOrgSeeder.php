<?php

namespace Database\Seeders\Uat;

use App\Enums\EmploymentType;
use App\Enums\Gender;
use App\Enums\RoleName;
use App\Enums\SalaryCalculation;
use App\Enums\SalaryComponentType;
use App\Enums\ScopeType;
use App\Enums\StaffDocumentType;
use App\Enums\StaffStatus;
use App\Models\Department;
use App\Models\Designation;
use App\Models\SalaryComponent;
use App\Models\ScopeAssignment;
use App\Models\StaffDocument;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use App\Models\StaffSalaryItem;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the campus workforce: departments, designations, a domain-specific
 * login for every operational role, staff records, documents, salary
 * components and salary structures.
 */
class UatOrgSeeder extends UatSeederBase
{
    /**
     * role => [job title, department code, head?]
     *
     * @var array<string, array{0: string, 1: string}>
     */
    protected const ROLE_JOBS = [
        RoleName::Principal->value => ['Principal', 'ADMIN'],
        RoleName::FinanceHead->value => ['Finance Manager', 'FIN'],
        RoleName::Accountant->value => ['Senior Accountant', 'FIN'],
        RoleName::AdmissionsOfficer->value => ['Admissions Officer', 'ADM'],
        RoleName::HrOfficer->value => ['HR Officer', 'HR'],
        RoleName::AcademicCoordinator->value => ['Academic Coordinator', 'ACA'],
        RoleName::ExamController->value => ['Exam Controller', 'EXM'],
        RoleName::StudentAffairsOfficer->value => ['Student Affairs Officer', 'STA'],
        RoleName::Counsellor->value => ['Student Counsellor', 'STA'],
        RoleName::CanteenManager->value => ['Canteen Manager', 'OPS'],
        RoleName::SportsDirector->value => ['Sports Director', 'SPT'],
        RoleName::ItAdministrator->value => ['IT Administrator', 'IT'],
        RoleName::Librarian->value => ['Head Librarian', 'LIB'],
        RoleName::StoreIncharge->value => ['Store Incharge', 'OPS'],
        RoleName::TransportHostelIncharge->value => ['Transport & Hostel Incharge', 'OPS'],
    ];

    /**
     * @var array<string, array{0: string, 1: string, 2: int}>
     */
    protected const DEPARTMENTS = [
        'ADMIN' => ['Administration', 'Administration', 1],
        'ACA' => ['Academics', 'Academic', 2],
        'FIN' => ['Finance', 'Finance', 3],
        'HR' => ['Human Resources', 'Human Resources', 4],
        'ADM' => ['Admissions', 'Admissions', 5],
        'EXM' => ['Examinations', 'Examinations', 6],
        'LIB' => ['Library', 'Library', 7],
        'IT' => ['Information Technology', 'IT', 8],
        'SPT' => ['Sports', 'Sports', 9],
        'STA' => ['Student Affairs', 'Student Affairs', 10],
        'OPS' => ['Operations', 'Operations', 11],
    ];

    /**
     * designation => [department code, grade, basic salary]
     *
     * @var array<string, array{0: string, 1: string, 2: int}>
     */
    protected const DESIGNATIONS = [
        'Principal' => ['ADMIN', 'A1', 220000],
        'Vice Principal' => ['ADMIN', 'A2', 160000],
        'Finance Manager' => ['FIN', 'A2', 150000],
        'Senior Accountant' => ['FIN', 'B1', 95000],
        'Admissions Officer' => ['ADM', 'B1', 90000],
        'HR Officer' => ['HR', 'B1', 92000],
        'Academic Coordinator' => ['ACA', 'B1', 100000],
        'Exam Controller' => ['EXM', 'B1', 98000],
        'Student Affairs Officer' => ['STA', 'B2', 80000],
        'Student Counsellor' => ['STA', 'B2', 85000],
        'Canteen Manager' => ['OPS', 'C1', 65000],
        'Sports Director' => ['SPT', 'B2', 88000],
        'IT Administrator' => ['IT', 'B1', 110000],
        'Head Librarian' => ['LIB', 'B2', 82000],
        'Store Incharge' => ['OPS', 'C1', 60000],
        'Transport & Hostel Incharge' => ['OPS', 'C1', 62000],
        'Senior Teacher' => ['ACA', 'B1', 95000],
        'Teacher' => ['ACA', 'B2', 75000],
        'Lab Assistant' => ['ACA', 'C2', 48000],
        'Office Assistant' => ['ADMIN', 'C2', 42000],
        'Accountant' => ['FIN', 'B2', 72000],
        'Driver' => ['OPS', 'D1', 40000],
        'Security Guard' => ['OPS', 'D1', 38000],
        'Support Staff' => ['OPS', 'D2', 35000],
    ];

    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 1000);

        $departments = $this->departments($ctx);
        $designations = $this->designations($ctx, $departments);

        $this->roleUsers($ctx, $departments, $designations);
        $this->supportStaff($ctx, $departments, $designations);
        $this->salaryComponents($ctx);
        $this->salaryStructures($ctx);

        $this->command?->info(sprintf(
            'UAT:   %s - %d users, %d staff, %d departments',
            $ctx->campusCode(),
            count($ctx->users),
            count($ctx->staff),
            count($departments)
        ));
    }

    /**
     * @return array<string, Department>
     */
    protected function departments(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $models = [];

        foreach (static::DEPARTMENTS as $code => [$name, $description, $order]) {
            $models[$code] = $this->first(Department::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'description' => $description.' department',
                'is_active' => true,
            ]);
        }

        return $models;
    }

    /**
     * @param  array<string, Department>  $departments
     * @return array<string, Designation>
     */
    protected function designations(UatCampusContext $ctx, array $departments): array
    {
        $tenant = $this->tenant($ctx->campus);
        $models = [];

        foreach (static::DESIGNATIONS as $name => [$deptCode, $grade, $salary]) {
            $code = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', $name));
            $models[$name] = $this->first(Designation::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'department_id' => $departments[$deptCode]->id,
                'name' => $name,
                'grade' => $grade,
                'is_active' => true,
            ]);
        }

        return $models;
    }

    /**
     * @param  array<string, Department>  $departments
     * @param  array<string, Designation>  $designations
     */
    protected function roleUsers(UatCampusContext $ctx, array $departments, array $designations): void
    {
        $slug = strtolower($ctx->campus->code);
        $seq = 0;

        foreach (static::ROLE_JOBS as $role => [$jobTitle, $deptCode]) {
            $seq++;
            $name = $this->person((int) $ctx->campus->id * 100 + $seq, null);
            $user = $this->createUser(
                $ctx,
                $role.'.'.$slug,
                $name['first_name'].' '.$name['last_name'],
                $jobTitle,
                $seq
            );

            $this->assignRole($ctx, $user, $role);
            $ctx->users[$role] = $user;
            $this->staffMember($ctx, $user, $jobTitle, $deptCode, $designations, $seq);
        }

        // Teachers (a team per campus).
        $ctx->teachers = [];
        for ($i = 1; $i <= 6; $i++) {
            $seq++;
            $name = $this->person((int) $ctx->campus->id * 100 + $seq, $i % 2 === 0 ? 'female' : 'male');
            $user = $this->createUser(
                $ctx,
                'teacher'.$i.'.'.$slug,
                $name['first_name'].' '.$name['last_name'],
                $i <= 2 ? 'Senior Teacher' : 'Teacher',
                $seq
            );
            $this->assignRole($ctx, $user, RoleName::Teacher->value);
            $ctx->teachers[] = $user;
            $this->staffMember($ctx, $user, $i <= 2 ? 'Senior Teacher' : 'Teacher', 'ACA', $designations, $seq);
        }
        $ctx->users[RoleName::Teacher->value] = $ctx->teachers[0];
    }

    /**
     * @param  array<string, Department>  $departments
     * @param  array<string, Designation>  $designations
     */
    protected function supportStaff(UatCampusContext $ctx, array $departments, array $designations): void
    {
        $support = [
            ['Accountant', 'FIN', 'male'],
            ['Accountant', 'FIN', 'female'],
            ['Lab Assistant', 'ACA', 'male'],
            ['Lab Assistant', 'ACA', 'female'],
            ['Office Assistant', 'ADMIN', 'male'],
            ['Office Assistant', 'ADMIN', 'female'],
            ['Driver', 'OPS', 'male'],
            ['Driver', 'OPS', 'male'],
            ['Security Guard', 'OPS', 'male'],
            ['Security Guard', 'OPS', 'male'],
            ['Support Staff', 'OPS', 'female'],
            ['Support Staff', 'OPS', 'male'],
        ];

        $seq = 100;
        foreach ($support as [$designation, $deptCode, $gender]) {
            $seq++;
            $name = $this->person((int) $ctx->campus->id * 100 + $seq, $gender);
            $this->staffMember(
                $ctx,
                null,
                $designation,
                $deptCode,
                $designations,
                $seq,
                $name['first_name'].' '.$name['last_name'],
                $gender
            );
        }
    }

    protected function createUser(UatCampusContext $ctx, string $local, string $name, string $jobTitle, int $seq): User
    {
        $email = $local.'@'.UatFoundationSeeder::EMAIL_DOMAIN;

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, $seq),
                'employee_code' => $ctx->campusCode().'-'.strtoupper(substr(preg_replace('/[^a-z]/i', '', $local) ?: 'USR', 0, 3)).sprintf('%03d', $seq),
                'job_title' => $jobTitle,
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );

        return $user;
    }

    /**
     * @param  array<string, Designation>  $designations
     */
    protected function staffMember(
        UatCampusContext $ctx,
        ?User $user,
        string $designationName,
        string $deptCode,
        array $designations,
        int $seq,
        ?string $fullName = null,
        string $gender = 'male'
    ): StaffMember {
        $tenant = $this->tenant($ctx->campus);
        $designation = $designations[$designationName] ?? null;

        if ($fullName === null && $user !== null) {
            $fullName = $user->name;
        }

        [$first, $last] = array_pad(explode(' ', (string) $fullName, 2), 2, '');

        $employeeNo = $ctx->campusCode().'-EMP-'.sprintf('%04d', $seq);

        $staff = StaffMember::firstOrCreate(
            ['campus_id' => $ctx->campus->id, 'employee_no' => $employeeNo],
            $tenant + [
                'user_id' => $user?->id,
                'department_id' => $designations[$designationName]->department_id ?? null,
                'designation_id' => $designation?->id,
                'first_name' => $first,
                'last_name' => $last,
                'gender' => $gender,
                'date_of_birth' => $this->day('1985-01-01', $seq * 37),
                'cnic' => $this->cnic($seq + (int) $ctx->campus->id * 13),
                'phone' => $user?->phone ?? $this->phone($ctx->campus, $seq + 500),
                'email' => $user?->email ?? strtolower($ctx->campusCode().'.staff'.$seq.'@'.UatFoundationSeeder::EMAIL_DOMAIN),
                'address' => $this->street($seq).', '.$this->city((int) $ctx->campus->id + $seq),
                'emergency_contact_name' => 'Family Contact',
                'emergency_contact_phone' => $this->phone($ctx->campus, $seq + 900),
                'employment_type' => $user !== null ? EmploymentType::Permanent : EmploymentType::Contract,
                'status' => StaffStatus::Active,
                'joining_date' => $this->day('2020-08-01', $seq * 11),
                'bank_name' => 'Meezan Bank',
                'bank_account_no' => sprintf('PK36MEZN%012d', $seq + (int) $ctx->campus->id * 100),
                'tax_number' => sprintf('NTN-%07d', $seq + (int) $ctx->campus->id * 50),
            ]
        );

        $ctx->staff[] = $staff;
        if ($user !== null) {
            $ctx->staffByUser[$user->id] = $staff;
        }

        $this->staffDocuments($ctx, $staff, $seq);

        return $staff;
    }

    protected function staffDocuments(UatCampusContext $ctx, StaffMember $staff, int $seq): void
    {
        $tenant = $this->tenant($ctx->campus);
        $docs = [
            [StaffDocumentType::Contract, 'Employment Contract'],
            [StaffDocumentType::Qualification, 'Degree / Qualification'],
            [StaffDocumentType::IdentityCard, 'CNIC Copy'],
        ];

        foreach ($docs as $i => [$type, $title]) {
            StaffDocument::firstOrCreate(
                ['staff_member_id' => $staff->id, 'title' => $title],
                $tenant + [
                    'type' => $type,
                    'file_path' => 'uat/staff/'.$staff->id.'-'.$i.'.pdf',
                    'original_name' => strtolower(str_replace(' ', '-', $title)).'.pdf',
                    'mime_type' => 'application/pdf',
                    'size' => 102400 + $i * 2048,
                    'issued_on' => $this->day('2020-08-01', $seq * 3),
                    'is_verified' => true,
                    'verified_at' => now(),
                ]
            );
        }
    }

    protected function salaryComponents(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $components = [
            ['Basic Salary', 'BASIC', SalaryComponentType::Earning, SalaryCalculation::Fixed, null, null, false, 1],
            ['House Rent Allowance', 'HRA', SalaryComponentType::Earning, SalaryCalculation::PercentageOfBasic, null, 45, true, 2],
            ['Medical Allowance', 'MED', SalaryComponentType::Earning, SalaryCalculation::Fixed, 5000, null, false, 3],
            ['Conveyance Allowance', 'CONV', SalaryComponentType::Earning, SalaryCalculation::Fixed, 4000, null, false, 4],
            ['Special Allowance', 'SPEC', SalaryComponentType::Earning, SalaryCalculation::PercentageOfBasic, null, 10, true, 5],
            ['Provident Fund', 'PF', SalaryComponentType::Deduction, SalaryCalculation::PercentageOfBasic, null, 8, false, 6],
            ['Income Tax', 'TAX', SalaryComponentType::Deduction, SalaryCalculation::PercentageOfBasic, null, 7, false, 7],
            ['EOBI', 'EOBI', SalaryComponentType::Deduction, SalaryCalculation::Fixed, 370, null, false, 8],
        ];

        foreach ($components as [$name, $code, $type, $calc, $amount, $percentage, $taxable, $order]) {
            $this->first(SalaryComponent::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'type' => $type,
                'calculation' => $calc,
                'default_amount' => $amount,
                'default_percentage' => $percentage,
                'is_taxable' => $taxable,
                'is_active' => true,
                'sort_order' => $order,
            ]);
        }
    }

    protected function salaryStructures(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $components = SalaryComponent::query()
            ->where('campus_id', $ctx->campus->id)
            ->get()
            ->keyBy('code');

        $i = 0;
        foreach ($ctx->staff as $staff) {
            $i++;
            $designationName = $staff->designation?->name ?? 'Teacher';
            $basic = static::DESIGNATIONS[$designationName][2] ?? 60000;

            $salary = $this->first(StaffSalary::class, [
                'staff_member_id' => $staff->id,
                'effective_from' => '2026-07-01',
            ], $tenant + [
                'basic_salary' => $basic,
                'currency' => 'PKR',
                'is_active' => true,
            ]);

            foreach ($components as $code => $component) {
                $amount = match ($code) {
                    'BASIC' => $basic,
                    'HRA' => $this->decimal($basic * 0.45),
                    'MED' => 5000,
                    'CONV' => 4000,
                    'SPEC' => $this->decimal($basic * 0.10),
                    'PF' => $this->decimal($basic * 0.08),
                    'TAX' => $this->decimal($basic * 0.07),
                    'EOBI' => 370,
                    default => null,
                };

                StaffSalaryItem::firstOrCreate(
                    ['staff_salary_id' => $salary->id, 'salary_component_id' => $component->id],
                    [
                        'amount' => $amount,
                        'percentage' => $component->default_percentage,
                    ]
                );
            }
        }
    }
}
