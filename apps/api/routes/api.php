<?php

use App\Http\Controllers\Api\AcademicEventController;
use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AccountingPeriodController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AdmissionDocumentController;
use App\Http\Controllers\Api\ApprovalRequestController;
use App\Http\Controllers\Api\ApprovalWorkflowController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BankReconciliationController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CampusController;
use App\Http\Controllers\Api\CanteenHygieneCheckController;
use App\Http\Controllers\Api\CanteenItemController;
use App\Http\Controllers\Api\CanteenReportController;
use App\Http\Controllers\Api\CanteenSaleController;
use App\Http\Controllers\Api\CanteenStockEntryController;
use App\Http\Controllers\Api\CanteenSupplierController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\ClassBookController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\ClassSubjectController;
use App\Http\Controllers\Api\ConcessionController;
use App\Http\Controllers\Api\ConcessionPolicyController;
use App\Http\Controllers\Api\ConductRecordController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DesignationController;
use App\Http\Controllers\Api\ExamAnalysisController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ExamMarkController;
use App\Http\Controllers\Api\ExamPaperController;
use App\Http\Controllers\Api\ExamTypeController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\ExpensePaymentController;
use App\Http\Controllers\Api\FeeHeadController;
use App\Http\Controllers\Api\FeePaymentController;
use App\Http\Controllers\Api\FeePlanController;
use App\Http\Controllers\Api\FeeRefundController;
use App\Http\Controllers\Api\FeeReminderController;
use App\Http\Controllers\Api\FeeReportController;
use App\Http\Controllers\Api\FeeVoucherController;
use App\Http\Controllers\Api\FinanceReportController;
use App\Http\Controllers\Api\FineRuleController;
use App\Http\Controllers\Api\FiscalYearController;
use App\Http\Controllers\Api\GradeScaleController;
use App\Http\Controllers\Api\GuardianController;
use App\Http\Controllers\Api\IncomeSourceController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\InvigilationDutyController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LessonPlanController;
use App\Http\Controllers\Api\LiabilityController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OnlinePaymentController;
use App\Http\Controllers\Api\OtherIncomeController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PayrollAdjustmentController;
use App\Http\Controllers\Api\PayrollRunController;
use App\Http\Controllers\Api\PeriodController;
use App\Http\Controllers\Api\PlatformReportController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SalaryComponentController;
use App\Http\Controllers\Api\ScholarshipAwardController;
use App\Http\Controllers\Api\ScholarshipController;
use App\Http\Controllers\Api\ScopeAssignmentController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\StaffAttendanceController;
use App\Http\Controllers\Api\StaffDocumentController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\StaffReportController;
use App\Http\Controllers\Api\StaffSalaryController;
use App\Http\Controllers\Api\StageController;
use App\Http\Controllers\Api\StudentAttendanceController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentWalletController;
use App\Http\Controllers\Api\StudentDocumentController;
use App\Http\Controllers\Api\StudentEnrollmentController;
use App\Http\Controllers\Api\StudentFineController;
use App\Http\Controllers\Api\StudentHistoryController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\SubstituteAssignmentController;
use App\Http\Controllers\Api\SyllabusUnitController;
use App\Http\Controllers\Api\TaxReturnController;
use App\Http\Controllers\Api\TaxRuleController;
use App\Http\Controllers\Api\TeachingAssignmentController;
use App\Http\Controllers\Api\TermController;
use App\Http\Controllers\Api\TimetableGenerationController;
use App\Http\Controllers\Api\TimetableSlotController;
use App\Http\Controllers\Api\TimetableViewController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:sensitive');
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:sensitive');
    Route::get('auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')->name('verification.verify');

    Route::post('webhooks/payments/{gateway}', [PaymentWebhookController::class, 'handle'])
        ->middleware('throttle:sensitive');

    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('auth/me', [ProfileController::class, 'show']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('auth/tokens', [SessionController::class, 'index']);
        Route::delete('auth/tokens', [SessionController::class, 'destroyOthers']);
        Route::delete('auth/tokens/{token}', [SessionController::class, 'destroy']);

        Route::put('auth/password', [ProfileController::class, 'updatePassword']);

        Route::post('auth/email/verification-notification', [AuthController::class, 'sendVerificationEmail'])
            ->middleware('throttle:sensitive');

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

        Route::get('reports/platform-overview', [PlatformReportController::class, 'overview'])
            ->middleware('permission:report.view');

        Route::middleware('campus')->group(function () {
            $academic = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:academic.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:academic.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:academic.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:academic.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:academic.delete');
            };

            $curriculum = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:curriculum.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:curriculum.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:curriculum.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:curriculum.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:curriculum.delete');
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

            $curriculum('syllabus-units', SyllabusUnitController::class, 'syllabusUnit');
            $curriculum('class-books', ClassBookController::class, 'classBook');
            $curriculum('lesson-plans', LessonPlanController::class, 'lessonPlan');

            Route::post('lesson-plans/{lessonPlan}/approve', [LessonPlanController::class, 'approve'])
                ->middleware('permission:curriculum.approve');

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

            Route::post('timetable/generate', [TimetableGenerationController::class, 'store'])
                ->middleware('permission:timetable.create');
            Route::delete('timetable/generate', [TimetableGenerationController::class, 'destroy'])
                ->middleware('permission:timetable.delete');

            Route::get('substitute-assignments', [SubstituteAssignmentController::class, 'index'])->middleware('permission:timetable.view');
            Route::post('substitute-assignments', [SubstituteAssignmentController::class, 'store'])->middleware('permission:timetable.create');
            Route::get('substitute-assignments/{substituteAssignment}', [SubstituteAssignmentController::class, 'show'])->middleware('permission:timetable.view');
            Route::post('substitute-assignments/{substituteAssignment}/cancel', [SubstituteAssignmentController::class, 'cancel'])->middleware('permission:timetable.edit');
            Route::delete('substitute-assignments/{substituteAssignment}', [SubstituteAssignmentController::class, 'destroy'])->middleware('permission:timetable.delete');

            $exam = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:exam.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:exam.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:exam.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:exam.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:exam.delete');
            };

            $exam('exam-types', ExamTypeController::class, 'examType');
            $exam('grade-scales', GradeScaleController::class, 'gradeScale');
            $exam('exams', ExamController::class, 'exam');
            $exam('exam-papers', ExamPaperController::class, 'examPaper');

            Route::post('exams/{exam}/publish', [ExamController::class, 'publish'])->middleware('permission:exam.approve');
            Route::get('exams/{exam}/merit-list', [ExamController::class, 'meritList'])->middleware('permission:exam.view');
            Route::get('exams/{exam}/students/{student}/result-card', [ExamMarkController::class, 'resultCard'])->middleware('permission:exam.view');
            Route::get('exams/{exam}/analysis/class', [ExamAnalysisController::class, 'classRoom'])->middleware('permission:exam.view');
            Route::get('exams/{exam}/analysis/subject', [ExamAnalysisController::class, 'subject'])->middleware('permission:exam.view');
            Route::get('exams/{exam}/analysis/teachers', [ExamAnalysisController::class, 'teachers'])->middleware('permission:exam.view');
            Route::get('exams/analysis/year-on-year', [ExamAnalysisController::class, 'yearOnYear'])->middleware('permission:exam.view');

            Route::get('exam-marks', [ExamMarkController::class, 'index'])->middleware('permission:exam.view');
            Route::post('exam-marks/bulk', [ExamMarkController::class, 'bulkStore'])->middleware('permission:exam.marks');

            Route::get('invigilation-duties', [InvigilationDutyController::class, 'index'])->middleware('permission:exam.view');
            Route::post('invigilation-duties', [InvigilationDutyController::class, 'store'])->middleware('permission:exam.edit');
            Route::get('invigilation-duties/{invigilationDuty}', [InvigilationDutyController::class, 'show'])->middleware('permission:exam.view');
            Route::put('invigilation-duties/{invigilationDuty}', [InvigilationDutyController::class, 'update'])->middleware('permission:exam.edit');
            Route::delete('invigilation-duties/{invigilationDuty}', [InvigilationDutyController::class, 'destroy'])->middleware('permission:exam.edit');

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

            Route::get('income-sources', [IncomeSourceController::class, 'index'])->middleware('permission:finance.view');
            Route::post('income-sources', [IncomeSourceController::class, 'store'])->middleware('permission:finance.create');
            Route::get('income-sources/{incomeSource}', [IncomeSourceController::class, 'show'])->middleware('permission:finance.view');
            Route::put('income-sources/{incomeSource}', [IncomeSourceController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('income-sources/{incomeSource}', [IncomeSourceController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('other-incomes', [OtherIncomeController::class, 'index'])->middleware('permission:finance.view');
            Route::post('other-incomes', [OtherIncomeController::class, 'store'])->middleware('permission:finance.create');
            Route::get('other-incomes/{otherIncome}', [OtherIncomeController::class, 'show'])->middleware('permission:finance.view');
            Route::post('other-incomes/{otherIncome}/void', [OtherIncomeController::class, 'void'])->middleware('permission:finance.approve');

            Route::get('tax-rules', [TaxRuleController::class, 'index'])->middleware('permission:finance.view');
            Route::post('tax-rules', [TaxRuleController::class, 'store'])->middleware('permission:finance.create');
            Route::get('tax-rules/{taxRule}', [TaxRuleController::class, 'show'])->middleware('permission:finance.view');
            Route::put('tax-rules/{taxRule}', [TaxRuleController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('tax-rules/{taxRule}', [TaxRuleController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('tax-returns', [TaxReturnController::class, 'index'])->middleware('permission:finance.view');
            Route::post('tax-returns', [TaxReturnController::class, 'store'])->middleware('permission:finance.create');
            Route::get('tax-returns/{taxReturn}', [TaxReturnController::class, 'show'])->middleware('permission:finance.view');
            Route::put('tax-returns/{taxReturn}', [TaxReturnController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('tax-returns/{taxReturn}', [TaxReturnController::class, 'destroy'])->middleware('permission:finance.delete');
            Route::post('tax-returns/{taxReturn}/file', [TaxReturnController::class, 'file'])->middleware('permission:finance.approve');
            Route::post('tax-returns/{taxReturn}/pay', [TaxReturnController::class, 'pay'])->middleware('permission:finance.approve');
            Route::post('tax-returns/{taxReturn}/documents', [TaxReturnController::class, 'addDocument'])->middleware('permission:finance.edit');
            Route::delete('tax-returns/{taxReturn}/documents/{document}', [TaxReturnController::class, 'deleteDocument'])->middleware('permission:finance.edit');

            Route::get('approval-workflows', [ApprovalWorkflowController::class, 'index'])->middleware('permission:finance.view');
            Route::post('approval-workflows', [ApprovalWorkflowController::class, 'store'])->middleware('permission:finance.create');
            Route::get('approval-workflows/{approvalWorkflow}', [ApprovalWorkflowController::class, 'show'])->middleware('permission:finance.view');
            Route::put('approval-workflows/{approvalWorkflow}', [ApprovalWorkflowController::class, 'update'])->middleware('permission:finance.edit');
            Route::delete('approval-workflows/{approvalWorkflow}', [ApprovalWorkflowController::class, 'destroy'])->middleware('permission:finance.delete');

            Route::get('approvals', [ApprovalRequestController::class, 'index'])->middleware('permission:finance.view');
            Route::post('approvals', [ApprovalRequestController::class, 'store'])->middleware('permission:finance.create');
            Route::get('approvals/{approvalRequest}', [ApprovalRequestController::class, 'show'])->middleware('permission:finance.view');
            Route::post('approvals/{approvalRequest}/approve', [ApprovalRequestController::class, 'approve'])->middleware('permission:finance.approve');
            Route::post('approvals/{approvalRequest}/reject', [ApprovalRequestController::class, 'reject'])->middleware('permission:finance.approve');
            Route::post('approvals/{approvalRequest}/cancel', [ApprovalRequestController::class, 'cancel'])->middleware('permission:finance.edit');

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
            Route::post('fee-vouchers/generate-prorated', [FeeVoucherController::class, 'generateProrated'])->middleware('permission:fee.create');
            Route::get('fee-vouchers/{feeVoucher}', [FeeVoucherController::class, 'show'])->middleware('permission:fee.view');
            Route::post('fee-vouchers/{feeVoucher}/void', [FeeVoucherController::class, 'void'])->middleware('permission:fee.approve');
            Route::post('fee-vouchers/{feeVoucher}/late-fee', [FeeVoucherController::class, 'applyLateFee'])->middleware('permission:fee.approve');

            Route::get('fee-payments', [FeePaymentController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-payments', [FeePaymentController::class, 'store'])->middleware('permission:fee.create');
            Route::get('fee-payments/{feePayment}', [FeePaymentController::class, 'show'])->middleware('permission:fee.view');
            Route::post('fee-payments/{feePayment}/void', [FeePaymentController::class, 'void'])->middleware('permission:fee.approve');
            Route::post('fee-payments/{feePayment}/apply', [FeePaymentController::class, 'apply'])->middleware('permission:fee.edit');

            Route::get('online-payments', [OnlinePaymentController::class, 'index'])->middleware('permission:fee.view');
            Route::post('online-payments', [OnlinePaymentController::class, 'initiate'])->middleware('permission:fee.create');
            Route::get('online-payments/status', [OnlinePaymentController::class, 'status'])->middleware('permission:fee.view');
            Route::get('online-payments/{paymentIntent}', [OnlinePaymentController::class, 'show'])->middleware('permission:fee.view');
            Route::post('online-payments/{paymentIntent}/cancel', [OnlinePaymentController::class, 'cancel'])->middleware('permission:fee.edit');

            Route::get('fee-refunds', [FeeRefundController::class, 'index'])->middleware('permission:fee.view');
            Route::post('fee-refunds', [FeeRefundController::class, 'store'])->middleware('permission:fee.create');
            Route::get('fee-refunds/{feeRefund}', [FeeRefundController::class, 'show'])->middleware('permission:fee.view');
            Route::post('fee-refunds/{feeRefund}/approve', [FeeRefundController::class, 'approve'])->middleware('permission:fee.approve');
            Route::post('fee-refunds/{feeRefund}/reject', [FeeRefundController::class, 'reject'])->middleware('permission:fee.approve');
            Route::post('fee-refunds/{feeRefund}/revoke', [FeeRefundController::class, 'revoke'])->middleware('permission:fee.approve');

            Route::get('fine-rules', [FineRuleController::class, 'index'])->middleware('permission:fine.view');
            Route::post('fine-rules', [FineRuleController::class, 'store'])->middleware('permission:fine.create');
            Route::get('fine-rules/{fineRule}', [FineRuleController::class, 'show'])->middleware('permission:fine.view');
            Route::put('fine-rules/{fineRule}', [FineRuleController::class, 'update'])->middleware('permission:fine.edit');
            Route::delete('fine-rules/{fineRule}', [FineRuleController::class, 'destroy'])->middleware('permission:fine.delete');

            Route::get('fines', [StudentFineController::class, 'index'])->middleware('permission:fine.view');
            Route::post('fines', [StudentFineController::class, 'store'])->middleware('permission:fine.create');
            Route::get('fines/{fine}', [StudentFineController::class, 'show'])->middleware('permission:fine.view');
            Route::post('fines/{fine}/apply', [StudentFineController::class, 'apply'])->middleware('permission:fine.approve');
            Route::post('fines/{fine}/waive', [StudentFineController::class, 'waive'])->middleware('permission:fine.approve');
            Route::post('fines/{fine}/revoke', [StudentFineController::class, 'revoke'])->middleware('permission:fine.approve');

            Route::get('fee-reminders', [FeeReminderController::class, 'index'])->middleware('permission:reminder.view');
            Route::post('fee-reminders', [FeeReminderController::class, 'store'])->middleware('permission:reminder.create');
            Route::post('fee-reminders/send', [FeeReminderController::class, 'sendBatch'])->middleware('permission:reminder.send');
            Route::get('fee-reminders/{reminder}', [FeeReminderController::class, 'show'])->middleware('permission:reminder.view');
            Route::post('fee-reminders/{reminder}/send', [FeeReminderController::class, 'send'])->middleware('permission:reminder.send');
            Route::post('fee-reminders/{reminder}/cancel', [FeeReminderController::class, 'cancel'])->middleware('permission:reminder.send');
            Route::delete('fee-reminders/{reminder}', [FeeReminderController::class, 'destroy'])->middleware('permission:reminder.delete');

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
            Route::get('students/{student}/history', [StudentHistoryController::class, 'show'])->middleware('permission:student.view');

            Route::get('students/{student}/documents', [StudentDocumentController::class, 'index'])->middleware('permission:student.view');
            Route::post('students/{student}/documents', [StudentDocumentController::class, 'store'])->middleware('permission:student.create');
            Route::get('students/{student}/documents/{document}/download', [StudentDocumentController::class, 'download'])->middleware('permission:student.view');
            Route::post('students/{student}/documents/{document}/verify', [StudentDocumentController::class, 'verify'])->middleware('permission:student.approve');
            Route::delete('students/{student}/documents/{document}', [StudentDocumentController::class, 'destroy'])->middleware('permission:student.delete');

            Route::get('conduct-records', [ConductRecordController::class, 'index'])->middleware('permission:conduct.view');
            Route::post('conduct-records', [ConductRecordController::class, 'store'])->middleware('permission:conduct.create');
            Route::get('conduct-records/{conductRecord}', [ConductRecordController::class, 'show'])->middleware('permission:conduct.view');
            Route::put('conduct-records/{conductRecord}', [ConductRecordController::class, 'update'])->middleware('permission:conduct.edit');
            Route::post('conduct-records/{conductRecord}/resolve', [ConductRecordController::class, 'resolve'])->middleware('permission:conduct.approve');
            Route::delete('conduct-records/{conductRecord}', [ConductRecordController::class, 'destroy'])->middleware('permission:conduct.delete');

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

            Route::get('scholarships', [ScholarshipController::class, 'index'])->middleware('permission:scholarship.view');
            Route::post('scholarships', [ScholarshipController::class, 'store'])->middleware('permission:scholarship.create');
            Route::get('scholarships/{scholarship}', [ScholarshipController::class, 'show'])->middleware('permission:scholarship.view');
            Route::put('scholarships/{scholarship}', [ScholarshipController::class, 'update'])->middleware('permission:scholarship.edit');
            Route::delete('scholarships/{scholarship}', [ScholarshipController::class, 'destroy'])->middleware('permission:scholarship.delete');

            Route::get('scholarship-awards', [ScholarshipAwardController::class, 'index'])->middleware('permission:scholarship.view');
            Route::post('scholarship-awards', [ScholarshipAwardController::class, 'store'])->middleware('permission:scholarship.create');
            Route::get('scholarship-awards/{scholarshipAward}', [ScholarshipAwardController::class, 'show'])->middleware('permission:scholarship.view');
            Route::post('scholarship-awards/{scholarshipAward}/revoke', [ScholarshipAwardController::class, 'revoke'])->middleware('permission:scholarship.approve');
            Route::delete('scholarship-awards/{scholarshipAward}', [ScholarshipAwardController::class, 'destroy'])->middleware('permission:scholarship.delete');

            Route::get('concession-policies', [ConcessionPolicyController::class, 'index'])->middleware('permission:concession.view');
            Route::post('concession-policies', [ConcessionPolicyController::class, 'store'])->middleware('permission:concession.create');
            Route::get('concession-policies/{concessionPolicy}', [ConcessionPolicyController::class, 'show'])->middleware('permission:concession.view');
            Route::put('concession-policies/{concessionPolicy}', [ConcessionPolicyController::class, 'update'])->middleware('permission:concession.edit');
            Route::delete('concession-policies/{concessionPolicy}', [ConcessionPolicyController::class, 'destroy'])->middleware('permission:concession.delete');

            Route::get('concessions', [ConcessionController::class, 'index'])->middleware('permission:concession.view');
            Route::post('concessions', [ConcessionController::class, 'store'])->middleware('permission:concession.create');
            Route::get('concessions/{concession}', [ConcessionController::class, 'show'])->middleware('permission:concession.view');
            Route::post('concessions/{concession}/approve', [ConcessionController::class, 'approve'])->middleware('permission:concession.approve');
            Route::post('concessions/{concession}/reject', [ConcessionController::class, 'reject'])->middleware('permission:concession.approve');
            Route::post('concessions/{concession}/revoke', [ConcessionController::class, 'revoke'])->middleware('permission:concession.approve');
            Route::delete('concessions/{concession}', [ConcessionController::class, 'destroy'])->middleware('permission:concession.delete');

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

            Route::get('attendance/students', [StudentAttendanceController::class, 'index'])->middleware('permission:attendance.view');
            Route::post('attendance/students', [StudentAttendanceController::class, 'store'])->middleware('permission:attendance.create');
            Route::post('attendance/students/bulk', [StudentAttendanceController::class, 'bulkStore'])->middleware('permission:attendance.create');
            Route::get('attendance/students/report', [StudentAttendanceController::class, 'report'])->middleware('permission:attendance.view');
            Route::get('attendance/students/students/{student}/report', [StudentAttendanceController::class, 'studentReport'])->middleware('permission:attendance.view');
            Route::put('attendance/students/{studentAttendance}', [StudentAttendanceController::class, 'update'])->middleware('permission:attendance.edit');
            Route::delete('attendance/students/{studentAttendance}', [StudentAttendanceController::class, 'destroy'])->middleware('permission:attendance.edit');

            Route::get('attendance/staff', [StaffAttendanceController::class, 'index'])->middleware('permission:attendance.view');
            Route::post('attendance/staff', [StaffAttendanceController::class, 'store'])->middleware('permission:attendance.create');
            Route::post('attendance/staff/bulk', [StaffAttendanceController::class, 'bulkStore'])->middleware('permission:attendance.create');
            Route::get('attendance/staff/report', [StaffAttendanceController::class, 'report'])->middleware('permission:attendance.view');
            Route::put('attendance/staff/{staffAttendance}', [StaffAttendanceController::class, 'update'])->middleware('permission:attendance.edit');
            Route::delete('attendance/staff/{staffAttendance}', [StaffAttendanceController::class, 'destroy'])->middleware('permission:attendance.edit');

            Route::get('notifications', [NotificationController::class, 'index'])->middleware('permission:notification.view');
            Route::post('notifications/queue-absences', [NotificationController::class, 'queueAbsences'])->middleware('permission:notification.create');
            Route::post('notifications/send', [NotificationController::class, 'sendBatch'])->middleware('permission:notification.send');
            Route::post('notifications/{notification}/send', [NotificationController::class, 'send'])->middleware('permission:notification.send');
            Route::post('notifications/{notification}/cancel', [NotificationController::class, 'cancel'])->middleware('permission:notification.send');

            $hr = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:hr.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:hr.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:hr.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:hr.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:hr.delete');
            };

            $hr('departments', DepartmentController::class, 'department');
            $hr('designations', DesignationController::class, 'designation');
            $hr('staff', StaffMemberController::class, 'staffMember');

            Route::post('staff/{staffMember}/terminate', [StaffMemberController::class, 'terminate'])->middleware('permission:hr.approve');

            Route::get('staff-reports/headcount', [StaffReportController::class, 'headcount'])->middleware('permission:hr.view');
            Route::get('staff-reports/joiners-leavers', [StaffReportController::class, 'joinersLeavers'])->middleware('permission:hr.view');

            Route::get('staff/{staffMember}/documents', [StaffDocumentController::class, 'index'])->middleware('permission:hr.view');
            Route::post('staff/{staffMember}/documents', [StaffDocumentController::class, 'store'])->middleware('permission:hr.create');
            Route::post('staff/{staffMember}/documents/{document}/verify', [StaffDocumentController::class, 'verify'])->middleware('permission:hr.approve');
            Route::get('staff/{staffMember}/documents/{document}/download', [StaffDocumentController::class, 'download'])->middleware('permission:hr.view');
            Route::delete('staff/{staffMember}/documents/{document}', [StaffDocumentController::class, 'destroy'])->middleware('permission:hr.delete');

            $payroll = function (string $uri, string $controller, string $param): void {
                Route::get($uri, [$controller, 'index'])->middleware('permission:payroll.view');
                Route::post($uri, [$controller, 'store'])->middleware('permission:payroll.create');
                Route::get("{$uri}/{".$param.'}', [$controller, 'show'])->middleware('permission:payroll.view');
                Route::put("{$uri}/{".$param.'}', [$controller, 'update'])->middleware('permission:payroll.edit');
                Route::delete("{$uri}/{".$param.'}', [$controller, 'destroy'])->middleware('permission:payroll.delete');
            };

            $payroll('salary-components', SalaryComponentController::class, 'salaryComponent');
            $payroll('staff-salaries', StaffSalaryController::class, 'staffSalary');
            $payroll('payroll-adjustments', PayrollAdjustmentController::class, 'payrollAdjustment');

            Route::get('payroll-runs', [PayrollRunController::class, 'index'])->middleware('permission:payroll.view');
            Route::post('payroll-runs', [PayrollRunController::class, 'store'])->middleware('permission:payroll.create');
            Route::get('payroll-runs/{payrollRun}', [PayrollRunController::class, 'show'])->middleware('permission:payroll.view');
            Route::delete('payroll-runs/{payrollRun}', [PayrollRunController::class, 'destroy'])->middleware('permission:payroll.delete');
            Route::post('payroll-runs/{payrollRun}/generate', [PayrollRunController::class, 'generate'])->middleware('permission:payroll.edit');
            Route::post('payroll-runs/{payrollRun}/approve', [PayrollRunController::class, 'approve'])->middleware('permission:payroll.approve');
            Route::post('payroll-runs/{payrollRun}/pay', [PayrollRunController::class, 'pay'])->middleware('permission:payroll.approve');
            Route::get('payroll-runs/{payrollRun}/payslips', [PayrollRunController::class, 'payslips'])->middleware('permission:payroll.view');
            Route::get('payslips/{payslip}', [PayrollRunController::class, 'showPayslip'])->middleware('permission:payroll.view');

            Route::get('leave-requests', [LeaveRequestController::class, 'index'])->middleware('permission:attendance.view');
            Route::post('leave-requests', [LeaveRequestController::class, 'store'])->middleware('permission:attendance.create');
            Route::get('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'show'])->middleware('permission:attendance.view');
            Route::put('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'update'])->middleware('permission:attendance.edit');
            Route::post('leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve'])->middleware('permission:attendance.approve');
            Route::post('leave-requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject'])->middleware('permission:attendance.approve');
            Route::post('leave-requests/{leaveRequest}/cancel', [LeaveRequestController::class, 'cancel'])->middleware('permission:attendance.edit');
            Route::delete('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'destroy'])->middleware('permission:attendance.approve');

            Route::get('canteen/suppliers', [CanteenSupplierController::class, 'index'])->middleware('permission:canteen.view');
            Route::post('canteen/suppliers', [CanteenSupplierController::class, 'store'])->middleware('permission:canteen.create');
            Route::get('canteen/suppliers/{supplier}', [CanteenSupplierController::class, 'show'])->middleware('permission:canteen.view');
            Route::put('canteen/suppliers/{supplier}', [CanteenSupplierController::class, 'update'])->middleware('permission:canteen.edit');
            Route::delete('canteen/suppliers/{supplier}', [CanteenSupplierController::class, 'destroy'])->middleware('permission:canteen.delete');

            Route::get('canteen/items', [CanteenItemController::class, 'index'])->middleware('permission:canteen.view');
            Route::post('canteen/items', [CanteenItemController::class, 'store'])->middleware('permission:canteen.create');
            Route::get('canteen/items/{item}', [CanteenItemController::class, 'show'])->middleware('permission:canteen.view');
            Route::put('canteen/items/{item}', [CanteenItemController::class, 'update'])->middleware('permission:canteen.edit');
            Route::delete('canteen/items/{item}', [CanteenItemController::class, 'destroy'])->middleware('permission:canteen.delete');
            Route::post('canteen/items/{item}/adjust-stock', [CanteenItemController::class, 'adjustStock'])->middleware('permission:canteen.approve');

            Route::get('canteen/stock-entries', [CanteenStockEntryController::class, 'index'])->middleware('permission:canteen.view');
            Route::post('canteen/stock-entries', [CanteenStockEntryController::class, 'store'])->middleware('permission:canteen.create');
            Route::get('canteen/stock-entries/{stockEntry}', [CanteenStockEntryController::class, 'show'])->middleware('permission:canteen.view');

            Route::get('canteen/sales', [CanteenSaleController::class, 'index'])->middleware('permission:canteen.view');
            Route::post('canteen/sales', [CanteenSaleController::class, 'store'])->middleware('permission:canteen.create');
            Route::get('canteen/sales/{sale}', [CanteenSaleController::class, 'show'])->middleware('permission:canteen.view');
            Route::post('canteen/sales/{sale}/void', [CanteenSaleController::class, 'void'])->middleware('permission:canteen.approve');

            Route::get('canteen/wallets', [StudentWalletController::class, 'index'])->middleware('permission:canteen.view');
            Route::get('canteen/students/{student}/wallet', [StudentWalletController::class, 'forStudent'])->middleware('permission:canteen.view');
            Route::get('canteen/wallets/{wallet}', [StudentWalletController::class, 'show'])->middleware('permission:canteen.view');
            Route::post('canteen/wallets/{wallet}/top-up', [StudentWalletController::class, 'topUp'])->middleware('permission:canteen.create');
            Route::post('canteen/wallets/{wallet}/adjust', [StudentWalletController::class, 'adjust'])->middleware('permission:canteen.approve');
            Route::get('canteen/wallets/{wallet}/transactions', [StudentWalletController::class, 'transactions'])->middleware('permission:canteen.view');

            Route::get('canteen/hygiene-checks', [CanteenHygieneCheckController::class, 'index'])->middleware('permission:canteen.view');
            Route::post('canteen/hygiene-checks', [CanteenHygieneCheckController::class, 'store'])->middleware('permission:canteen.create');
            Route::get('canteen/hygiene-checks/{hygieneCheck}', [CanteenHygieneCheckController::class, 'show'])->middleware('permission:canteen.view');
            Route::put('canteen/hygiene-checks/{hygieneCheck}', [CanteenHygieneCheckController::class, 'update'])->middleware('permission:canteen.edit');
            Route::delete('canteen/hygiene-checks/{hygieneCheck}', [CanteenHygieneCheckController::class, 'destroy'])->middleware('permission:canteen.delete');

            Route::get('canteen/reports/daily', [CanteenReportController::class, 'daily'])->middleware('permission:canteen.export');
            Route::get('canteen/reports/item-wise', [CanteenReportController::class, 'itemWise'])->middleware('permission:canteen.export');
            Route::get('canteen/reports/profit-loss', [CanteenReportController::class, 'profitLoss'])->middleware('permission:canteen.export');
            Route::get('canteen/reports/low-stock', [CanteenReportController::class, 'lowStock'])->middleware('permission:canteen.view');
            Route::get('canteen/reports/wallet-summary', [CanteenReportController::class, 'walletSummary'])->middleware('permission:canteen.export');

            Route::get('reports/campus-dashboard', [ReportController::class, 'campusDashboard'])->middleware('permission:report.view');
            Route::get('reports/progress', [ReportController::class, 'progress'])->middleware('permission:report.view');
            Route::get('reports/attendance', [ReportController::class, 'attendance'])->middleware('permission:report.view');
            Route::get('reports/results/{exam}', [ReportController::class, 'results'])->middleware('permission:report.view');
            Route::get('reports/staff', [ReportController::class, 'staff'])->middleware('permission:report.view');
            Route::get('reports/students/{student}/yearly', [ReportController::class, 'studentYearly'])->middleware('permission:report.view');
            Route::get('reports/financial', [ReportController::class, 'financial'])->middleware('permission:report.view');
            Route::get('reports/payroll', [ReportController::class, 'payroll'])->middleware('permission:report.view');
        });
    });
});
