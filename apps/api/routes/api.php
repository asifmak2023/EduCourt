<?php

use App\Http\Controllers\Api\AcademicEventController;
use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AccountingPeriodController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AdmissionDocumentController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BankReconciliationController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CampusController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\ClassSubjectController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExpensePaymentController;
use App\Http\Controllers\Api\FeeHeadController;
use App\Http\Controllers\Api\FeePaymentController;
use App\Http\Controllers\Api\FeePlanController;
use App\Http\Controllers\Api\FeeRefundController;
use App\Http\Controllers\Api\FeeReportController;
use App\Http\Controllers\Api\FeeVoucherController;
use App\Http\Controllers\Api\FinanceReportController;
use App\Http\Controllers\Api\FiscalYearController;
use App\Http\Controllers\Api\GuardianController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\LiabilityController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\PeriodController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\ScopeAssignmentController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\StageController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentEnrollmentController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TeachingAssignmentController;
use App\Http\Controllers\Api\TermController;
use App\Http\Controllers\Api\TimetableSlotController;
use App\Http\Controllers\Api\TimetableViewController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('auth/me', [ProfileController::class, 'show']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::prefix('meta')->group(function () {
            Route::get('roles', [MetaController::class, 'roles']);
            Route::get('scopes', [MetaController::class, 'scopes']);
            Route::get('permissions', [MetaController::class, 'permissions']);
        });

        Route::get('institutions', [InstitutionController::class, 'index'])
            ->middleware('permission:institution.view');
        Route::post('institutions', [InstitutionController::class, 'store'])
            ->middleware('permission:institution.create');
        Route::get('institutions/{institution}', [InstitutionController::class, 'show'])
            ->middleware('permission:institution.view');
        Route::put('institutions/{institution}', [InstitutionController::class, 'update'])
            ->middleware('permission:institution.edit');
        Route::delete('institutions/{institution}', [InstitutionController::class, 'destroy'])
            ->middleware('permission:institution.delete');

        Route::get('campuses', [CampusController::class, 'index'])
            ->middleware('permission:campus.view');
        Route::post('campuses', [CampusController::class, 'store'])
            ->middleware('permission:campus.create');
        Route::get('campuses/{campus}', [CampusController::class, 'show'])
            ->middleware('permission:campus.view');
        Route::put('campuses/{campus}', [CampusController::class, 'update'])
            ->middleware('permission:campus.edit');
        Route::delete('campuses/{campus}', [CampusController::class, 'destroy'])
            ->middleware('permission:campus.delete');

        Route::get('users', [UserController::class, 'index'])
            ->middleware('permission:user.view');
        Route::post('users', [UserController::class, 'store'])
            ->middleware('permission:user.create');
        Route::get('users/{user}', [UserController::class, 'show'])
            ->middleware('permission:user.view');
        Route::put('users/{user}', [UserController::class, 'update'])
            ->middleware('permission:user.edit');
        Route::delete('users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:user.delete');

        Route::get('scope-assignments', [ScopeAssignmentController::class, 'index'])
            ->middleware('permission:role.view');
        Route::post('scope-assignments', [ScopeAssignmentController::class, 'store'])
            ->middleware('permission:role.edit');
        Route::delete('scope-assignments/{scopeAssignment}', [ScopeAssignmentController::class, 'destroy'])
            ->middleware('permission:role.edit');

        Route::middleware('campus')->group(function () {
            $academic = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:academic.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:academic.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:academic.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:academic.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:academic.delete');
            };

            $academic('academic-years', AcademicYearController::class, 'academicYear');
            $academic('terms', TermController::class, 'term');
            $academic('stages', StageController::class, 'stage');
            $academic('classes', ClassRoomController::class, 'classRoom');
            $academic('sections', SectionController::class, 'section');
            $academic('subjects', SubjectController::class, 'subject');
            $academic('class-subjects', ClassSubjectController::class, 'classSubject');
            $academic('teaching-assignments', TeachingAssignmentController::class, 'teachingAssignment');
            $academic('academic-events', AcademicEventController::class, 'academicEvent');
            $academic('periods', PeriodController::class, 'period');
            $academic('rooms', RoomController::class, 'room');
            $academic('timetable-slots', TimetableSlotController::class, 'timetableSlot');

            Route::post('timetable-slots/publish', [TimetableSlotController::class, 'publish'])
                ->middleware('permission:timetable.approve');
            Route::post('timetable-slots/unpublish', [TimetableSlotController::class, 'unpublish'])
                ->middleware('permission:timetable.approve');

            Route::get('timetable/me', [TimetableViewController::class, 'me'])
                ->middleware('permission:timetable.view');
            Route::get('timetable/classes/{classRoom}', [TimetableViewController::class, 'classes'])
                ->middleware('permission:timetable.view');
            Route::get('timetable/teachers/{user}', [TimetableViewController::class, 'teachers'])
                ->middleware('permission:timetable.view');

            Route::get('fiscal-years', [FiscalYearController::class, 'index'])->middleware('permission:finance.view');
            Route::post('fiscal-years', [FiscalYearController::class, 'store'])->middleware('permission:finance.create');
            Route::get('fiscal-years/{fiscalYear}', [FiscalYearController::class, 'show'])->middleware('permission:finance.view');
            Route::put('fiscal-years/{fiscalYear}', [FiscalYearController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('fiscal-years/{fiscalYear}', [FiscalYearController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('chart-of-accounts', [ChartOfAccountController::class, 'index'])->middleware('permission:finance.view');
            Route::post('chart-of-accounts', [ChartOfAccountController::class, 'store'])->middleware('permission:finance.create');
            Route::get('chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'show'])->middleware('permission:finance.view');
            Route::put('chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('chart-of-accounts/{chartOfAccount}', [ChartOfAccountController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('journal-entries', [JournalEntryController::class, 'index'])->middleware('permission:finance.view');
            Route::post('journal-entries', [JournalEntryController::class, 'store'])->middleware('permission:finance.create');
            Route::get('journal-entries/{journalEntry}', [JournalEntryController::class, 'show'])->middleware('permission:finance.view');
            Route::put('journal-entries/{journalEntry}', [JournalEntryController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('journal-entries/{journalEntry}', [JournalEntryController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('journal-entries/{journalEntry}/post', [JournalEntryController::class, 'post'])->middleware('permission:finance.approve');
            Route::post('journal-entries/{journalEntry}/reverse', [JournalEntryController::class, 'reverse'])->middleware('permission:finance.approve');

            Route::get('finance/reports/trial-balance', [FinanceReportController::class, 'trialBalance'])->middleware('permission:finance.view');
            Route::get('finance/reports/ledger/{chartOfAccount}', [FinanceReportController::class, 'accountLedger'])->middleware('permission:finance.view');
            Route::get('finance/reports/budget-vs-actual', [FinanceReportController::class, 'budgetVsActual'])->middleware('permission:finance.view');

            Route::get('budgets', [BudgetController::class, 'index'])->middleware('permission:finance.view');
            Route::post('budgets', [BudgetController::class, 'store'])->middleware('permission:finance.create');
            Route::get('budgets/{budget}', [BudgetController::class, 'show'])->middleware('permission:finance.view');
            Route::put('budgets/{budget}', [BudgetController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('budgets/{budget}', [BudgetController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('budgets/{budget}/approve', [BudgetController::class, 'approve'])->middleware('permission:finance.approve');

            Route::get('finance/reports/payables', [FinanceReportController::class, 'payables'])->middleware('permission:finance.view');
            Route::get('finance/reports/expenses', [FinanceReportController::class, 'expenseSummary'])->middleware('permission:finance.view');

            Route::get('vendors', [VendorController::class, 'index'])->middleware('permission:finance.view');
            Route::post('vendors', [VendorController::class, 'store'])->middleware('permission:finance.create');
            Route::get('vendors/{vendor}', [VendorController::class, 'show'])->middleware('permission:finance.view');
            Route::put('vendors/{vendor}', [VendorController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('vendors/{vendor}', [VendorController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('expense-categories', [ExpenseCategoryController::class, 'index'])->middleware('permission:finance.view');
            Route::post('expense-categories', [ExpenseCategoryController::class, 'store'])->middleware('permission:finance.create');
            Route::get('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'show'])->middleware('permission:finance.view');
            Route::put('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('expenses', [ExpenseController::class, 'index'])->middleware('permission:finance.view');
            Route::post('expenses', [ExpenseController::class, 'store'])->middleware('permission:finance.create');
            Route::get('expenses/{expense}', [ExpenseController::class, 'show'])->middleware('permission:finance.view');
            Route::put('expenses/{expense}', [ExpenseController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('expenses/{expense}/approve', [ExpenseController::class, 'approve'])->middleware('permission:finance.approve');
            Route::post('expenses/{expense}/void', [ExpenseController::class, 'void'])->middleware('permission:finance.approve');

            Route::get('expense-payments', [ExpensePaymentController::class, 'index'])->middleware('permission:finance.view');
            Route::post('expense-payments', [ExpensePaymentController::class, 'store'])->middleware('permission:finance.create');
            Route::get('expense-payments/{expensePayment}', [ExpensePaymentController::class, 'show'])->middleware('permission:finance.view');
            Route::post('expense-payments/{expensePayment}/void', [ExpensePaymentController::class, 'void'])->middleware('permission:finance.approve');

            Route::get('finance/reports/cash-book', [FinanceReportController::class, 'cashBook'])->middleware('permission:finance.view');

            Route::get('bank-accounts', [BankAccountController::class, 'index'])->middleware('permission:finance.view');
            Route::post('bank-accounts', [BankAccountController::class, 'store'])->middleware('permission:finance.create');
            Route::get('bank-accounts/{bankAccount}', [BankAccountController::class, 'show'])->middleware('permission:finance.view');
            Route::put('bank-accounts/{bankAccount}', [BankAccountController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('bank-accounts/{bankAccount}', [BankAccountController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('bank-reconciliations', [BankReconciliationController::class, 'index'])->middleware('permission:finance.view');
            Route::post('bank-reconciliations', [BankReconciliationController::class, 'store'])->middleware('permission:finance.create');
            Route::get('bank-reconciliations/{bankReconciliation}', [BankReconciliationController::class, 'show'])->middleware('permission:finance.view');
            Route::put('bank-reconciliations/{bankReconciliation}', [BankReconciliationController::class, 'update'])->middleware('permission:finance.edit');
            Route::post('bank-reconciliations/{bankReconciliation}/complete', [BankReconciliationController::class, 'complete'])->middleware('permission:finance.approve');
            Route::delete('bank-reconciliations/{bankReconciliation}', [BankReconciliationController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('finance/reports/asset-register', [FinanceReportController::class, 'assetRegister'])->middleware('permission:finance.view');
            Route::get('finance/reports/liability-register', [FinanceReportController::class, 'liabilityRegister'])->middleware('permission:finance.view');
            Route::get('finance/reports/surplus-deficit', [FinanceReportController::class, 'surplusDeficit'])->middleware('permission:finance.view');
            Route::get('finance/reports/consolidated', [FinanceReportController::class, 'consolidatedStatement'])->middleware('permission:finance.view');

            Route::get('assets', [AssetController::class, 'index'])->middleware('permission:finance.view');
            Route::post('assets', [AssetController::class, 'store'])->middleware('permission:finance.create');
            Route::get('assets/{asset}', [AssetController::class, 'show'])->middleware('permission:finance.view');
            Route::put('assets/{asset}', [AssetController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('assets/{asset}', [AssetController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('assets/{asset}/dispose', [AssetController::class, 'dispose'])->middleware('permission:finance.approve');

            Route::get('liabilities', [LiabilityController::class, 'index'])->middleware('permission:finance.view');
            Route::post('liabilities', [LiabilityController::class, 'store'])->middleware('permission:finance.create');
            Route::get('liabilities/{liability}', [LiabilityController::class, 'show'])->middleware('permission:finance.view');
            Route::put('liabilities/{liability}', [LiabilityController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('liabilities/{liability}', [LiabilityController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('liabilities/{liability}/settle', [LiabilityController::class, 'settle'])->middleware('permission:finance.approve');

            Route::get('accounting-periods', [AccountingPeriodController::class, 'index'])->middleware('permission:finance.view');
            Route::post('accounting-periods', [AccountingPeriodController::class, 'store'])->middleware('permission:finance.create');
            Route::post('accounting-periods/generate', [AccountingPeriodController::class, 'generate'])->middleware('permission:finance.create');
            Route::get('accounting-periods/{accountingPeriod}', [AccountingPeriodController::class, 'show'])->middleware('permission:finance.view');
            Route::put('accounting-periods/{accountingPeriod}', [AccountingPeriodController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('accounting-periods/{accountingPeriod}', [AccountingPeriodController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('accounting-periods/{accountingPeriod}/close', [AccountingPeriodController::class, 'close'])->middleware('permission:finance.approve');
            Route::post('accounting-periods/{accountingPeriod}/reopen', [AccountingPeriodController::class, 'reopen'])->middleware('permission:finance.approve');
            Route::post('accounting-periods/{accountingPeriod}/lock', [AccountingPeriodController::class, 'lock'])->middleware('permission:finance.approve');

            Route::get('fee-heads', [FeeHeadController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-heads', [FeeHeadController::class, 'store'])->middleware('permission:fee.create');
            Route::get('fee-heads/{feeHead}', [FeeHeadController::class, 'show'])->middleware('permission:fee.view');
            Route::put('fee-heads/{feeHead}', [FeeHeadController::class, 'update'])->middleware('permission:fee.edit');
            Route::delete('fee-heads/{feeHead}', [FeeHeadController::class, 'destroy'])->middleware('permission:fee.delete');

            Route::get('fee-plans', [FeePlanController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-plans', [FeePlanController::class, 'store'])->middleware('permission:fee.create');
            Route::get('fee-plans/{feePlan}', [FeePlanController::class, 'show'])->middleware('permission:fee.view');
            Route::put('fee-plans/{feePlan}', [FeePlanController::class, 'update'])->middleware('permission:fee.edit');
            Route::delete('fee-plans/{feePlan}', [FeePlanController::class, 'destroy'])->middleware('permission:fee.delete');

            Route::get('fee-vouchers', [FeeVoucherController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-vouchers/generate', [FeeVoucherController::class, 'generate'])->middleware('permission:fee.create');
            Route::get('fee-vouchers/{feeVoucher}', [FeeVoucherController::class, 'show'])->middleware('permission:fee.view');
            Route::post('fee-vouchers/{feeVoucher}/void', [FeeVoucherController::class, 'void'])->middleware('permission:fee.approve');
            Route::post('fee-vouchers/{feeVoucher}/late-fee', [FeeVoucherController::class, 'applyLateFee'])->middleware('permission:fee.approve');

            Route::get('fee-payments', [FeePaymentController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-payments', [FeePaymentController::class, 'store'])->middleware('permission:fee.create');
            Route::get('fee-payments/{feePayment}', [FeePaymentController::class, 'show'])->middleware('permission:fee.view');
            Route::post('fee-payments/{feePayment}/void', [FeePaymentController::class, 'void'])->middleware('permission:fee.approve');
            Route::post('fee-payments/{feePayment}/apply', [FeePaymentController::class, 'apply'])->middleware('permission:fee.edit');

            Route::get('fee-refunds', [FeeRefundController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-refunds', [FeeRefundController::class, 'store'])->middleware('permission:fee.approve');
            Route::get('fee-refunds/{feeRefund}', [FeeRefundController::class, 'show'])->middleware('permission:fee.view');

            Route::get('fee-reports/defaulters', [FeeReportController::class, 'defaulters'])->middleware('permission:fee.view');
            Route::get('fee-reports/students/{student}/statement', [FeeReportController::class, 'studentStatement'])->middleware('permission:fee.view');
            Route::get('fee-reports/classes/summary', [FeeReportController::class, 'classSummary'])->middleware('permission:fee.view');
            Route::get('fee-reports/collection', [FeeReportController::class, 'collection'])->middleware('permission:fee.view');

            Route::get('students', [StudentController::class, 'index'])->middleware('permission:student.view');
            Route::post('students', [StudentController::class, 'store'])->middleware('permission:student.create');
            Route::post('students/promote', [StudentController::class, 'promote'])->middleware('permission:student.edit');
            Route::get('students/{student}', [StudentController::class, 'show'])->middleware('permission:student.view');
            Route::put('students/{student}', [StudentController::class, 'update'])->middleware('permission:student.edit');
            Route::delete('students/{student}', [StudentController::class, 'destroy'])->middleware('permission:student.delete');
            Route::post('students/{student}/withdraw', [StudentController::class, 'withdraw'])->middleware('permission:student.approve');

            Route::get('guardians', [GuardianController::class, 'index'])->middleware('permission:student.view');
            Route::post('guardians', [GuardianController::class, 'store'])->middleware('permission:student.create');
            Route::get('guardians/{guardian}', [GuardianController::class, 'show'])->middleware('permission:student.view');
            Route::put('guardians/{guardian}', [GuardianController::class, 'update'])->middleware('permission:student.edit');
            Route::delete('guardians/{guardian}', [GuardianController::class, 'destroy'])->middleware('permission:student.delete');

            Route::get('student-enrollments', [StudentEnrollmentController::class, 'index'])->middleware('permission:student.view');
            Route::post('student-enrollments', [StudentEnrollmentController::class, 'store'])->middleware('permission:student.create');
            Route::get('student-enrollments/{studentEnrollment}', [StudentEnrollmentController::class, 'show'])->middleware('permission:student.view');
            Route::put('student-enrollments/{studentEnrollment}', [StudentEnrollmentController::class, 'update'])->middleware('permission:student.edit');
            Route::delete('student-enrollments/{studentEnrollment}', [StudentEnrollmentController::class, 'destroy'])->middleware('permission:student.delete');

            Route::get('admissions', [AdmissionController::class, 'index'])->middleware('permission:admission.view');
            Route::post('admissions', [AdmissionController::class, 'store'])->middleware('permission:admission.create');
            Route::get('admissions/{admission}', [AdmissionController::class, 'show'])->middleware('permission:admission.view');
            Route::put('admissions/{admission}', [AdmissionController::class, 'update'])->middleware('permission:admission.edit');
            Route::delete('admissions/{admission}', [AdmissionController::class, 'destroy'])->middleware('permission:admission.delete');
            Route::post('admissions/{admission}/submit', [AdmissionController::class, 'submit'])->middleware('permission:admission.edit');
            Route::post('admissions/{admission}/approve', [AdmissionController::class, 'approve'])->middleware('permission:admission.approve');
            Route::post('admissions/{admission}/reject', [AdmissionController::class, 'reject'])->middleware('permission:admission.approve');
            Route::post('admissions/{admission}/enroll', [AdmissionController::class, 'enroll'])->middleware('permission:admission.approve');

            Route::get('admissions/{admission}/documents', [AdmissionDocumentController::class, 'index'])->middleware('permission:admission.view');
            Route::post('admissions/{admission}/documents', [AdmissionDocumentController::class, 'store'])->middleware('permission:admission.create');
            Route::get('admissions/{admission}/documents/{document}/download', [AdmissionDocumentController::class, 'download'])->middleware('permission:admission.view');
            Route::delete('admissions/{admission}/documents/{document}', [AdmissionDocumentController::class, 'destroy'])->middleware('permission:admission.delete');
        });
    });
});
