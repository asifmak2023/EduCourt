<?php

namespace App\Support\Codes;

use App\Models\AcademicYear;
use App\Models\ApprovalWorkflow;
use App\Models\Asset;
use App\Models\BankAccount;
use App\Models\Campus;
use App\Models\CanteenItem;
use App\Models\ClassRoom;
use App\Models\ConcessionPolicy;
use App\Models\Department;
use App\Models\Designation;
use App\Models\ExamType;
use App\Models\ExpenseCategory;
use App\Models\FeeHead;
use App\Models\FineRule;
use App\Models\FiscalYear;
use App\Models\GradeScale;
use App\Models\Hostel;
use App\Models\IncomeSource;
use App\Models\Institution;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\ItAsset;
use App\Models\Lab;
use App\Models\LabEquipment;
use App\Models\Liability;
use App\Models\Room;
use App\Models\SalaryComponent;
use App\Models\Scholarship;
use App\Models\Sport;
use App\Models\SportEquipment;
use App\Models\Stage;
use App\Models\StudentClub;
use App\Models\Subject;
use App\Models\TaxRule;
use App\Models\TransportRoute;
use App\Models\Vendor;
use InvalidArgumentException;

/**
 * Maps a code-bearing resource to the model, column, prefix and tenant scope
 * used when generating a human-readable identifier.
 */
final class CodeRegistry
{
    public const SCOPE_GLOBAL = 'global';

    public const SCOPE_INSTITUTION = 'institution';

    public const SCOPE_CAMPUS = 'campus';

    /**
     * @return array{model: class-string, column: string, prefix: string, padding: int, scope: string}
     */
    public static function get(string $resource): array
    {
        $profiles = [
            'institutions' => self::profile(Institution::class, 'INS', self::SCOPE_GLOBAL),
            'campuses' => self::profile(Campus::class, 'CMP', self::SCOPE_INSTITUTION),
            'academic-years' => self::profile(AcademicYear::class, 'AY', self::SCOPE_CAMPUS),
            'fiscal-years' => self::profile(FiscalYear::class, 'FY', self::SCOPE_CAMPUS),
            'stages' => self::profile(Stage::class, 'STG', self::SCOPE_CAMPUS),
            'classes' => self::profile(ClassRoom::class, 'CLS', self::SCOPE_CAMPUS),
            'subjects' => self::profile(Subject::class, 'SUB', self::SCOPE_CAMPUS),
            'rooms' => self::profile(Room::class, 'RM', self::SCOPE_CAMPUS),
            'vendors' => self::profile(Vendor::class, 'VND', self::SCOPE_CAMPUS),
            'fee-heads' => self::profile(FeeHead::class, 'FH', self::SCOPE_CAMPUS),
            'expense-categories' => self::profile(ExpenseCategory::class, 'EC', self::SCOPE_CAMPUS),
            'bank-accounts' => self::profile(BankAccount::class, 'BA', self::SCOPE_CAMPUS),
            'assets' => self::profile(Asset::class, 'AST', self::SCOPE_CAMPUS),
            'liabilities' => self::profile(Liability::class, 'LIA', self::SCOPE_CAMPUS),
            'scholarships' => self::profile(Scholarship::class, 'SCH', self::SCOPE_CAMPUS),
            'concession-policies' => self::profile(ConcessionPolicy::class, 'CON', self::SCOPE_CAMPUS),
            'fine-rules' => self::profile(FineRule::class, 'FINE', self::SCOPE_CAMPUS),
            'income-sources' => self::profile(IncomeSource::class, 'INC', self::SCOPE_CAMPUS),
            'tax-rules' => self::profile(TaxRule::class, 'TAX', self::SCOPE_CAMPUS),
            'approval-workflows' => self::profile(ApprovalWorkflow::class, 'WF', self::SCOPE_CAMPUS),
            'exam-types' => self::profile(ExamType::class, 'EXT', self::SCOPE_CAMPUS),
            'grade-scales' => self::profile(GradeScale::class, 'GS', self::SCOPE_CAMPUS),
            'departments' => self::profile(Department::class, 'DEP', self::SCOPE_CAMPUS),
            'designations' => self::profile(Designation::class, 'DSG', self::SCOPE_CAMPUS),
            'salary-components' => self::profile(SalaryComponent::class, 'SC', self::SCOPE_CAMPUS),
            'canteen-items' => self::profile(CanteenItem::class, 'CI', self::SCOPE_CAMPUS),
            'clubs' => self::profile(StudentClub::class, 'CLB', self::SCOPE_CAMPUS),
            'sports' => self::profile(Sport::class, 'SPT', self::SCOPE_CAMPUS),
            'sport-equipment' => self::profile(SportEquipment::class, 'SEQ', self::SCOPE_CAMPUS),
            'inventory-categories' => self::profile(InventoryCategory::class, 'IC', self::SCOPE_CAMPUS),
            'inventory-items' => self::profile(InventoryItem::class, 'INV', self::SCOPE_CAMPUS),
            'labs' => self::profile(Lab::class, 'LAB', self::SCOPE_CAMPUS),
            'lab-equipment' => self::profile(LabEquipment::class, 'LEQ', self::SCOPE_CAMPUS),
            'transport-routes' => self::profile(TransportRoute::class, 'RT', self::SCOPE_CAMPUS),
            'hostels' => self::profile(Hostel::class, 'HST', self::SCOPE_CAMPUS),
            'it-assets' => self::profile(ItAsset::class, 'IT', self::SCOPE_CAMPUS, 'asset_tag'),
        ];

        if (! isset($profiles[$resource])) {
            throw new InvalidArgumentException("Unknown code resource [{$resource}].");
        }

        return $profiles[$resource];
    }

    /**
     * @param  class-string  $model
     * @return array{model: class-string, column: string, prefix: string, padding: int, scope: string}
     */
    private static function profile(string $model, string $prefix, string $scope, string $column = 'code', int $padding = 4): array
    {
        return [
            'model' => $model,
            'column' => $column,
            'prefix' => $prefix,
            'padding' => $padding,
            'scope' => $scope,
        ];
    }
}
