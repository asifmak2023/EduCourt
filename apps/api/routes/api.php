<?php

use App\Http\Controllers\Api\AcademicEventController;
use App\Http\Controllers\Api\AcademicYearController;
use App\Http\Controllers\Api\AccountingPeriodController;
use App\Http\Controllers\Api\AdmissionController;
use App\Http\Controllers\Api\AdmissionDocumentController;
use App\Http\Controllers\Api\AlumniProfileController;
use App\Http\Controllers\Api\ApprovalRequestController;
use App\Http\Controllers\Api\ApprovalWorkflowController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AttendanceSyncController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\BankReconciliationController;
use App\Http\Controllers\Api\BookController;
use App\Http\Controllers\Api\BookIssueController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CampusController;
use App\Http\Controllers\Api\CanteenHygieneCheckController;
use App\Http\Controllers\Api\CanteenItemController;
use App\Http\Controllers\Api\CanteenReportController;
use App\Http\Controllers\Api\CanteenSaleController;
use App\Http\Controllers\Api\CanteenStockEntryController;
use App\Http\Controllers\Api\CanteenSupplierController;
use App\Http\Controllers\Api\ChartOfAccountController;
use App\Http\Controllers\Api\CircularController;
use App\Http\Controllers\Api\ClassBookController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\ClassSubjectController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ConcessionController;
use App\Http\Controllers\Api\ConcessionPolicyController;
use App\Http\Controllers\Api\ConductRecordController;
use App\Http\Controllers\Api\CouncilMemberController;
use App\Http\Controllers\Api\CounsellingSessionController;
use App\Http\Controllers\Api\CourseRegistrationController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\DesignationController;
use App\Http\Controllers\Api\ExamAnalysisController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ExamMarkController;
use App\Http\Controllers\Api\ExamModerationController;
use App\Http\Controllers\Api\ExamPaperController;
use App\Http\Controllers\Api\ExamReevaluationController;
use App\Http\Controllers\Api\ExamSupplementaryController;
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
use App\Http\Controllers\Api\HelpdeskTicketController;
use App\Http\Controllers\Api\HostelAllocationController;
use App\Http\Controllers\Api\HostelController;
use App\Http\Controllers\Api\HostelOutpassController;
use App\Http\Controllers\Api\HostelReportController;
use App\Http\Controllers\Api\HostelRoomController;
use App\Http\Controllers\Api\IncomeSourceController;
use App\Http\Controllers\Api\InstitutionController;
use App\Http\Controllers\Api\InventoryCategoryController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\InventoryReportController;
use App\Http\Controllers\Api\InvigilationDutyController;
use App\Http\Controllers\Api\ItAssetController;
use App\Http\Controllers\Api\ItBackupLogController;
use App\Http\Controllers\Api\ItChangeRequestController;
use App\Http\Controllers\Api\ItReportController;
use App\Http\Controllers\Api\ItSystemController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\LabBookingController;
use App\Http\Controllers\Api\LabController;
use App\Http\Controllers\Api\LabEquipmentController;
use App\Http\Controllers\Api\LabReportController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LessonPlanController;
use App\Http\Controllers\Api\LiabilityController;
use App\Http\Controllers\Api\LibraryReportController;
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
use App\Http\Controllers\Api\PtmBookingController;
use App\Http\Controllers\Api\PtmEventController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\SalaryComponentController;
use App\Http\Controllers\Api\ScholarshipAwardController;
use App\Http\Controllers\Api\ScholarshipController;
use App\Http\Controllers\Api\ScopeAssignmentController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\SportAchievementController;
use App\Http\Controllers\Api\SportController;
use App\Http\Controllers\Api\SportEquipmentController;
use App\Http\Controllers\Api\SportFixtureController;
use App\Http\Controllers\Api\SportReportController;
use App\Http\Controllers\Api\SportTeamController;
use App\Http\Controllers\Api\SportTrainingSessionController;
use App\Http\Controllers\Api\SsoAuthController;
use App\Http\Controllers\Api\SsoProviderController;
use App\Http\Controllers\Api\StaffAttendanceController;
use App\Http\Controllers\Api\StaffDocumentController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\StaffReportController;
use App\Http\Controllers\Api\StaffSalaryController;
use App\Http\Controllers\Api\StageController;
use App\Http\Controllers\Api\StudentAttendanceController;
use App\Http\Controllers\Api\StudentCertificateController;
use App\Http\Controllers\Api\StudentClubController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentDocumentController;
use App\Http\Controllers\Api\StudentEnrollmentController;
use App\Http\Controllers\Api\StudentEventController;
use App\Http\Controllers\Api\StudentFineController;
use App\Http\Controllers\Api\StudentHistoryController;
use App\Http\Controllers\Api\StudentWalletController;
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
use App\Http\Controllers\Api\TranscriptController;
use App\Http\Controllers\Api\TransportAllocationController;
use App\Http\Controllers\Api\TransportReportController;
use App\Http\Controllers\Api\TransportRouteController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\VisitorLogController;
use App\Http\Controllers\Api\WelfareRecordController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:sensitive');
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:sensitive');

    Route::get('auth/sso/{provider}/authorize', [SsoAuthController::class, 'authorize'])
        ->middleware('throttle:sensitive');
    Route::post('auth/sso/{provider}/callback', [SsoAuthController::class, 'callback'])
        ->middleware('throttle:sensitive');
    Route::get('auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')->name('verification.verify');

    Route::post('webhooks/payments/{gateway}', [PaymentWebhookController::class, 'handle'])
        ->middleware('throttle:sensitive');

    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('auth/me', [ProfileController::class, 'show']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/sso/{provider}/logout', [SsoAuthController::class, 'logout']);

        Route::get('sso-providers', [SsoProviderController::class, 'index'])->middleware('permission:setting.view');
        Route::post('sso-providers', [SsoProviderController::class, 'store'])->middleware('permission:setting.edit');
        Route::get('sso-providers/{provider}', [SsoProviderController::class, 'show'])->middleware('permission:setting.view');
        Route::put('sso-providers/{provider}', [SsoProviderController::class, 'update'])->middleware('permission:setting.edit');
        Route::delete('sso-providers/{provider}', [SsoProviderController::class, 'destroy'])->middleware('permission:setting.edit');

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

            Route::get('exam-moderations', [ExamModerationController::class, 'index'])->middleware('permission:exam.view');
            Route::post('exam-moderations', [ExamModerationController::class, 'store'])->middleware('permission:exam.edit');
            Route::get('exam-moderations/{moderation}', [ExamModerationController::class, 'show'])->middleware('permission:exam.view');
            Route::post('exam-moderations/{moderation}/approve', [ExamModerationController::class, 'approve'])->middleware('permission:exam.approve');
            Route::post('exam-moderations/{moderation}/apply', [ExamModerationController::class, 'apply'])->middleware('permission:exam.approve');
            Route::post('exam-moderations/{moderation}/reject', [ExamModerationController::class, 'reject'])->middleware('permission:exam.approve');
            Route::delete('exam-moderations/{moderation}', [ExamModerationController::class, 'destroy'])->middleware('permission:exam.edit');

            Route::get('exam-reevaluations', [ExamReevaluationController::class, 'index'])->middleware('permission:exam.view');
            Route::post('exam-reevaluations', [ExamReevaluationController::class, 'store'])->middleware('permission:exam.edit');
            Route::get('exam-reevaluations/{reevaluation}', [ExamReevaluationController::class, 'show'])->middleware('permission:exam.view');
            Route::post('exam-reevaluations/{reevaluation}/review', [ExamReevaluationController::class, 'review'])->middleware('permission:exam.approve');
            Route::delete('exam-reevaluations/{reevaluation}', [ExamReevaluationController::class, 'destroy'])->middleware('permission:exam.edit');

            Route::get('exam-supplementaries', [ExamSupplementaryController::class, 'index'])->middleware('permission:exam.view');
            Route::post('exam-supplementaries', [ExamSupplementaryController::class, 'store'])->middleware('permission:exam.edit');
            Route::get('exam-supplementaries/{supplementary}', [ExamSupplementaryController::class, 'show'])->middleware('permission:exam.view');
            Route::post('exam-supplementaries/{supplementary}/approve', [ExamSupplementaryController::class, 'approve'])->middleware('permission:exam.approve');
            Route::post('exam-supplementaries/{supplementary}/reject', [ExamSupplementaryController::class, 'reject'])->middleware('permission:exam.approve');
            Route::post('exam-supplementaries/{supplementary}/complete', [ExamSupplementaryController::class, 'complete'])->middleware('permission:exam.edit');
            Route::delete('exam-supplementaries/{supplementary}', [ExamSupplementaryController::class, 'destroy'])->middleware('permission:exam.edit');
            Route::get('exams/{exam}/supplementary-eligible', [ExamSupplementaryController::class, 'eligible'])->middleware('permission:exam.view');

            Route::get('course-registrations', [CourseRegistrationController::class, 'index'])->middleware('permission:credit.view');
            Route::post('course-registrations', [CourseRegistrationController::class, 'store'])->middleware('permission:credit.create');
            Route::get('course-registrations/{registration}', [CourseRegistrationController::class, 'show'])->middleware('permission:credit.view');
            Route::post('course-registrations/{registration}/drop', [CourseRegistrationController::class, 'drop'])->middleware('permission:credit.edit');
            Route::delete('course-registrations/{registration}', [CourseRegistrationController::class, 'destroy'])->middleware('permission:credit.delete');
            Route::get('students/{student}/transcript', [TranscriptController::class, 'show'])->middleware('permission:credit.view');
            Route::get('students/{student}/term-gpa', [TranscriptController::class, 'term'])->middleware('permission:credit.view');

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

            Route::post('attendance/sync', [AttendanceSyncController::class, 'store'])->middleware('permission:attendance.create');
            Route::get('attendance/sync-batches', [AttendanceSyncController::class, 'index'])->middleware('permission:attendance.view');

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

            Route::get('student-affairs/clubs', [StudentClubController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/clubs', [StudentClubController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/clubs/{club}', [StudentClubController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/clubs/{club}', [StudentClubController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/clubs/{club}', [StudentClubController::class, 'destroy'])->middleware('permission:student_affairs.delete');
            Route::get('student-affairs/clubs/{club}/members', [StudentClubController::class, 'memberships'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/clubs/{club}/members', [StudentClubController::class, 'addMember'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/clubs/{club}/members/{membership}', [StudentClubController::class, 'removeMember'])->middleware('permission:student_affairs.edit');

            Route::get('student-affairs/events', [StudentEventController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/events', [StudentEventController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/events/{event}', [StudentEventController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/events/{event}', [StudentEventController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/events/{event}', [StudentEventController::class, 'destroy'])->middleware('permission:student_affairs.delete');
            Route::post('student-affairs/events/{event}/participants', [StudentEventController::class, 'addParticipant'])->middleware('permission:student_affairs.edit');
            Route::get('student-affairs/events/{event}/participants', [StudentEventController::class, 'participants'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/events/{event}/participants/{participant}', [StudentEventController::class, 'updateParticipant'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/events/{event}/participants/{participant}', [StudentEventController::class, 'removeParticipant'])->middleware('permission:student_affairs.edit');

            Route::get('student-affairs/certificates', [StudentCertificateController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/certificates', [StudentCertificateController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/certificates/{certificate}', [StudentCertificateController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/certificates/{certificate}', [StudentCertificateController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::post('student-affairs/certificates/{certificate}/issue', [StudentCertificateController::class, 'issue'])->middleware('permission:student_affairs.approve');
            Route::delete('student-affairs/certificates/{certificate}', [StudentCertificateController::class, 'destroy'])->middleware('permission:student_affairs.delete');

            Route::get('student-affairs/welfare-records', [WelfareRecordController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/welfare-records', [WelfareRecordController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/welfare-records/{welfareRecord}', [WelfareRecordController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/welfare-records/{welfareRecord}', [WelfareRecordController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/welfare-records/{welfareRecord}', [WelfareRecordController::class, 'destroy'])->middleware('permission:student_affairs.delete');

            Route::get('student-affairs/alumni', [AlumniProfileController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/alumni', [AlumniProfileController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/alumni/{alumnus}', [AlumniProfileController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/alumni/{alumnus}', [AlumniProfileController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/alumni/{alumnus}', [AlumniProfileController::class, 'destroy'])->middleware('permission:student_affairs.delete');

            Route::get('student-affairs/council-members', [CouncilMemberController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/council-members', [CouncilMemberController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/council-members/{councilMember}', [CouncilMemberController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/council-members/{councilMember}', [CouncilMemberController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::delete('student-affairs/council-members/{councilMember}', [CouncilMemberController::class, 'destroy'])->middleware('permission:student_affairs.delete');

            Route::get('student-affairs/complaints', [ComplaintController::class, 'index'])->middleware('permission:student_affairs.view');
            Route::post('student-affairs/complaints', [ComplaintController::class, 'store'])->middleware('permission:student_affairs.create');
            Route::get('student-affairs/complaints/{complaint}', [ComplaintController::class, 'show'])->middleware('permission:student_affairs.view');
            Route::put('student-affairs/complaints/{complaint}', [ComplaintController::class, 'update'])->middleware('permission:student_affairs.edit');
            Route::post('student-affairs/complaints/{complaint}/assign', [ComplaintController::class, 'assign'])->middleware('permission:student_affairs.edit');
            Route::post('student-affairs/complaints/{complaint}/resolve', [ComplaintController::class, 'resolve'])->middleware('permission:student_affairs.approve');
            Route::post('student-affairs/complaints/{complaint}/reject', [ComplaintController::class, 'reject'])->middleware('permission:student_affairs.approve');
            Route::delete('student-affairs/complaints/{complaint}', [ComplaintController::class, 'destroy'])->middleware('permission:student_affairs.delete');

            Route::get('student-affairs/counselling', [CounsellingSessionController::class, 'index'])->middleware('permission:counselling.view');
            Route::post('student-affairs/counselling', [CounsellingSessionController::class, 'store'])->middleware('permission:counselling.create');
            Route::get('student-affairs/counselling/{counsellingSession}', [CounsellingSessionController::class, 'show'])->middleware('permission:counselling.view');
            Route::put('student-affairs/counselling/{counsellingSession}', [CounsellingSessionController::class, 'update'])->middleware('permission:counselling.edit');
            Route::delete('student-affairs/counselling/{counsellingSession}', [CounsellingSessionController::class, 'destroy'])->middleware('permission:counselling.delete');

            Route::get('sports/teams', [SportTeamController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports/teams', [SportTeamController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/teams/{team}', [SportTeamController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/teams/{team}', [SportTeamController::class, 'update'])->middleware('permission:sports.edit');
            Route::delete('sports/teams/{team}', [SportTeamController::class, 'destroy'])->middleware('permission:sports.delete');
            Route::get('sports/teams/{team}/members', [SportTeamController::class, 'members'])->middleware('permission:sports.view');
            Route::post('sports/teams/{team}/members', [SportTeamController::class, 'addMember'])->middleware('permission:sports.edit');
            Route::delete('sports/teams/{team}/members/{member}', [SportTeamController::class, 'removeMember'])->middleware('permission:sports.edit');

            Route::get('sports/training-sessions', [SportTrainingSessionController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports/training-sessions', [SportTrainingSessionController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/training-sessions/{trainingSession}', [SportTrainingSessionController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/training-sessions/{trainingSession}', [SportTrainingSessionController::class, 'update'])->middleware('permission:sports.edit');
            Route::delete('sports/training-sessions/{trainingSession}', [SportTrainingSessionController::class, 'destroy'])->middleware('permission:sports.delete');

            Route::get('sports/fixtures', [SportFixtureController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports/fixtures', [SportFixtureController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/fixtures/{fixture}', [SportFixtureController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/fixtures/{fixture}', [SportFixtureController::class, 'update'])->middleware('permission:sports.edit');
            Route::post('sports/fixtures/{fixture}/result', [SportFixtureController::class, 'recordResult'])->middleware('permission:sports.edit');
            Route::delete('sports/fixtures/{fixture}', [SportFixtureController::class, 'destroy'])->middleware('permission:sports.delete');

            Route::get('sports/achievements', [SportAchievementController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports/achievements', [SportAchievementController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/achievements/{achievement}', [SportAchievementController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/achievements/{achievement}', [SportAchievementController::class, 'update'])->middleware('permission:sports.edit');
            Route::delete('sports/achievements/{achievement}', [SportAchievementController::class, 'destroy'])->middleware('permission:sports.delete');

            Route::get('sports/equipment', [SportEquipmentController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports/equipment', [SportEquipmentController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/equipment/{equipment}', [SportEquipmentController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/equipment/{equipment}', [SportEquipmentController::class, 'update'])->middleware('permission:sports.edit');
            Route::delete('sports/equipment/{equipment}', [SportEquipmentController::class, 'destroy'])->middleware('permission:sports.delete');
            Route::get('sports/equipment/{equipment}/movements', [SportEquipmentController::class, 'movements'])->middleware('permission:sports.view');
            Route::post('sports/equipment/{equipment}/movements', [SportEquipmentController::class, 'recordMovement'])->middleware('permission:sports.edit');

            Route::get('sports/reports/summary', [SportReportController::class, 'summary'])->middleware('permission:sports.export');

            Route::get('sports', [SportController::class, 'index'])->middleware('permission:sports.view');
            Route::post('sports', [SportController::class, 'store'])->middleware('permission:sports.create');
            Route::get('sports/{sport}/students/{student}/eligibility', [SportController::class, 'eligibility'])->middleware('permission:sports.view');
            Route::get('sports/{sport}', [SportController::class, 'show'])->middleware('permission:sports.view');
            Route::put('sports/{sport}', [SportController::class, 'update'])->middleware('permission:sports.edit');
            Route::delete('sports/{sport}', [SportController::class, 'destroy'])->middleware('permission:sports.delete');

            Route::get('it/assets', [ItAssetController::class, 'index'])->middleware('permission:it.view');
            Route::post('it/assets', [ItAssetController::class, 'store'])->middleware('permission:it.create');
            Route::get('it/assets/{asset}', [ItAssetController::class, 'show'])->middleware('permission:it.view');
            Route::put('it/assets/{asset}', [ItAssetController::class, 'update'])->middleware('permission:it.edit');
            Route::delete('it/assets/{asset}', [ItAssetController::class, 'destroy'])->middleware('permission:it.delete');
            Route::get('it/assets/{asset}/assignments', [ItAssetController::class, 'assignments'])->middleware('permission:it.view');
            Route::post('it/assets/{asset}/assign', [ItAssetController::class, 'assign'])->middleware('permission:it.edit');
            Route::post('it/assets/{asset}/return', [ItAssetController::class, 'returnAsset'])->middleware('permission:it.edit');

            Route::get('it/tickets', [HelpdeskTicketController::class, 'index'])->middleware('permission:it.view');
            Route::post('it/tickets', [HelpdeskTicketController::class, 'store'])->middleware('permission:it.create');
            Route::get('it/tickets/{ticket}', [HelpdeskTicketController::class, 'show'])->middleware('permission:it.view');
            Route::put('it/tickets/{ticket}', [HelpdeskTicketController::class, 'update'])->middleware('permission:it.edit');
            Route::post('it/tickets/{ticket}/assign', [HelpdeskTicketController::class, 'assign'])->middleware('permission:it.edit');
            Route::post('it/tickets/{ticket}/resolve', [HelpdeskTicketController::class, 'resolve'])->middleware('permission:it.edit');
            Route::post('it/tickets/{ticket}/close', [HelpdeskTicketController::class, 'close'])->middleware('permission:it.edit');
            Route::get('it/tickets/{ticket}/comments', [HelpdeskTicketController::class, 'comments'])->middleware('permission:it.view');
            Route::post('it/tickets/{ticket}/comments', [HelpdeskTicketController::class, 'addComment'])->middleware('permission:it.edit');
            Route::delete('it/tickets/{ticket}', [HelpdeskTicketController::class, 'destroy'])->middleware('permission:it.delete');

            Route::get('it/change-requests', [ItChangeRequestController::class, 'index'])->middleware('permission:it.view');
            Route::post('it/change-requests', [ItChangeRequestController::class, 'store'])->middleware('permission:it.create');
            Route::get('it/change-requests/{changeRequest}', [ItChangeRequestController::class, 'show'])->middleware('permission:it.view');
            Route::put('it/change-requests/{changeRequest}', [ItChangeRequestController::class, 'update'])->middleware('permission:it.edit');
            Route::post('it/change-requests/{changeRequest}/decide', [ItChangeRequestController::class, 'decide'])->middleware('permission:it.approve');
            Route::delete('it/change-requests/{changeRequest}', [ItChangeRequestController::class, 'destroy'])->middleware('permission:it.delete');

            Route::get('it/backups', [ItBackupLogController::class, 'index'])->middleware('permission:it.view');
            Route::post('it/backups', [ItBackupLogController::class, 'store'])->middleware('permission:it.create');
            Route::get('it/backups/{backupLog}', [ItBackupLogController::class, 'show'])->middleware('permission:it.view');
            Route::put('it/backups/{backupLog}', [ItBackupLogController::class, 'update'])->middleware('permission:it.edit');
            Route::delete('it/backups/{backupLog}', [ItBackupLogController::class, 'destroy'])->middleware('permission:it.delete');

            Route::get('it/systems', [ItSystemController::class, 'index'])->middleware('permission:it.view');
            Route::post('it/systems', [ItSystemController::class, 'store'])->middleware('permission:it.create');
            Route::get('it/systems/{system}', [ItSystemController::class, 'show'])->middleware('permission:it.view');
            Route::put('it/systems/{system}', [ItSystemController::class, 'update'])->middleware('permission:it.edit');
            Route::delete('it/systems/{system}', [ItSystemController::class, 'destroy'])->middleware('permission:it.delete');

            Route::get('it/reports/summary', [ItReportController::class, 'summary'])->middleware('permission:it.view');

            Route::get('circulars', [CircularController::class, 'index'])->middleware('permission:circular.view');
            Route::post('circulars', [CircularController::class, 'store'])->middleware('permission:circular.create');
            Route::get('circulars/{circular}', [CircularController::class, 'show'])->middleware('permission:circular.view');
            Route::put('circulars/{circular}', [CircularController::class, 'update'])->middleware('permission:circular.edit');
            Route::post('circulars/{circular}/publish', [CircularController::class, 'publish'])->middleware('permission:circular.approve');
            Route::post('circulars/{circular}/archive', [CircularController::class, 'archive'])->middleware('permission:circular.edit');
            Route::delete('circulars/{circular}', [CircularController::class, 'destroy'])->middleware('permission:circular.delete');

            Route::get('visitors', [VisitorLogController::class, 'index'])->middleware('permission:front_office.view');
            Route::post('visitors', [VisitorLogController::class, 'store'])->middleware('permission:front_office.create');
            Route::get('visitors/{visitor}', [VisitorLogController::class, 'show'])->middleware('permission:front_office.view');
            Route::put('visitors/{visitor}', [VisitorLogController::class, 'update'])->middleware('permission:front_office.edit');
            Route::post('visitors/{visitor}/checkout', [VisitorLogController::class, 'checkout'])->middleware('permission:front_office.edit');
            Route::delete('visitors/{visitor}', [VisitorLogController::class, 'destroy'])->middleware('permission:front_office.delete');

            Route::get('ptm-events', [PtmEventController::class, 'index'])->middleware('permission:ptm.view');
            Route::post('ptm-events', [PtmEventController::class, 'store'])->middleware('permission:ptm.create');
            Route::get('ptm-events/{ptmEvent}', [PtmEventController::class, 'show'])->middleware('permission:ptm.view');
            Route::put('ptm-events/{ptmEvent}', [PtmEventController::class, 'update'])->middleware('permission:ptm.edit');
            Route::delete('ptm-events/{ptmEvent}', [PtmEventController::class, 'destroy'])->middleware('permission:ptm.delete');
            Route::post('ptm-events/{ptmEvent}/slots', [PtmEventController::class, 'addSlot'])->middleware('permission:ptm.edit');
            Route::put('ptm-slots/{slot}', [PtmEventController::class, 'updateSlot'])->middleware('permission:ptm.edit');
            Route::delete('ptm-slots/{slot}', [PtmEventController::class, 'destroySlot'])->middleware('permission:ptm.edit');

            Route::get('ptm-bookings', [PtmBookingController::class, 'index'])->middleware('permission:ptm.view');
            Route::post('ptm-bookings', [PtmBookingController::class, 'store'])->middleware('permission:ptm.create');
            Route::get('ptm-bookings/{booking}', [PtmBookingController::class, 'show'])->middleware('permission:ptm.view');
            Route::post('ptm-bookings/{booking}/cancel', [PtmBookingController::class, 'cancel'])->middleware('permission:ptm.edit');
            Route::post('ptm-bookings/{booking}/mark', [PtmBookingController::class, 'mark'])->middleware('permission:ptm.edit');
            Route::delete('ptm-bookings/{booking}', [PtmBookingController::class, 'destroy'])->middleware('permission:ptm.delete');

            Route::get('inventory/categories', [InventoryCategoryController::class, 'index'])->middleware('permission:inventory.view');
            Route::post('inventory/categories', [InventoryCategoryController::class, 'store'])->middleware('permission:inventory.create');
            Route::get('inventory/categories/{inventoryCategory}', [InventoryCategoryController::class, 'show'])->middleware('permission:inventory.view');
            Route::put('inventory/categories/{inventoryCategory}', [InventoryCategoryController::class, 'update'])->middleware('permission:inventory.edit');
            Route::delete('inventory/categories/{inventoryCategory}', [InventoryCategoryController::class, 'destroy'])->middleware('permission:inventory.delete');

            Route::get('inventory/items', [InventoryItemController::class, 'index'])->middleware('permission:inventory.view');
            Route::post('inventory/items', [InventoryItemController::class, 'store'])->middleware('permission:inventory.create');
            Route::get('inventory/items/{inventoryItem}', [InventoryItemController::class, 'show'])->middleware('permission:inventory.view');
            Route::put('inventory/items/{inventoryItem}', [InventoryItemController::class, 'update'])->middleware('permission:inventory.edit');
            Route::delete('inventory/items/{inventoryItem}', [InventoryItemController::class, 'destroy'])->middleware('permission:inventory.delete');
            Route::get('inventory/items/{inventoryItem}/movements', [InventoryItemController::class, 'movements'])->middleware('permission:inventory.view');
            Route::post('inventory/items/{inventoryItem}/movements', [InventoryItemController::class, 'recordMovement'])->middleware('permission:inventory.edit');
            Route::get('inventory/reports/summary', [InventoryReportController::class, 'summary'])->middleware('permission:inventory.export');

            Route::get('library/books', [BookController::class, 'index'])->middleware('permission:library.view');
            Route::post('library/books', [BookController::class, 'store'])->middleware('permission:library.create');
            Route::get('library/books/{book}', [BookController::class, 'show'])->middleware('permission:library.view');
            Route::put('library/books/{book}', [BookController::class, 'update'])->middleware('permission:library.edit');
            Route::delete('library/books/{book}', [BookController::class, 'destroy'])->middleware('permission:library.delete');
            Route::get('library/issues', [BookIssueController::class, 'index'])->middleware('permission:library.view');
            Route::post('library/issues', [BookIssueController::class, 'store'])->middleware('permission:library.create');
            Route::get('library/issues/{bookIssue}', [BookIssueController::class, 'show'])->middleware('permission:library.view');
            Route::post('library/issues/{bookIssue}/return', [BookIssueController::class, 'returnBook'])->middleware('permission:library.edit');
            Route::get('library/reports/summary', [LibraryReportController::class, 'summary'])->middleware('permission:library.export');

            Route::get('labs', [LabController::class, 'index'])->middleware('permission:lab.view');
            Route::post('labs', [LabController::class, 'store'])->middleware('permission:lab.create');
            Route::get('labs/{lab}/equipment', [LabEquipmentController::class, 'index'])->middleware('permission:lab.view');
            Route::post('labs/{lab}/equipment', [LabEquipmentController::class, 'store'])->middleware('permission:lab.edit');
            Route::get('labs/{lab}/reports/summary', [LabReportController::class, 'summary'])->middleware('permission:lab.view');
            Route::get('labs/{lab}', [LabController::class, 'show'])->middleware('permission:lab.view');
            Route::put('labs/{lab}', [LabController::class, 'update'])->middleware('permission:lab.edit');
            Route::delete('labs/{lab}', [LabController::class, 'destroy'])->middleware('permission:lab.delete');
            Route::get('lab-equipment/{equipment}', [LabEquipmentController::class, 'show'])->middleware('permission:lab.view');
            Route::put('lab-equipment/{equipment}', [LabEquipmentController::class, 'update'])->middleware('permission:lab.edit');
            Route::delete('lab-equipment/{equipment}', [LabEquipmentController::class, 'destroy'])->middleware('permission:lab.delete');

            Route::get('lab-bookings', [LabBookingController::class, 'index'])->middleware('permission:lab.view');
            Route::post('lab-bookings', [LabBookingController::class, 'store'])->middleware('permission:lab.create');
            Route::get('lab-bookings/{booking}', [LabBookingController::class, 'show'])->middleware('permission:lab.view');
            Route::post('lab-bookings/{booking}/cancel', [LabBookingController::class, 'cancel'])->middleware('permission:lab.edit');
            Route::post('lab-bookings/{booking}/complete', [LabBookingController::class, 'complete'])->middleware('permission:lab.edit');
            Route::delete('lab-bookings/{booking}', [LabBookingController::class, 'destroy'])->middleware('permission:lab.delete');

            Route::get('transport/vehicles', [VehicleController::class, 'index'])->middleware('permission:transport.view');
            Route::post('transport/vehicles', [VehicleController::class, 'store'])->middleware('permission:transport.create');
            Route::get('transport/vehicles/{vehicle}', [VehicleController::class, 'show'])->middleware('permission:transport.view');
            Route::put('transport/vehicles/{vehicle}', [VehicleController::class, 'update'])->middleware('permission:transport.edit');
            Route::delete('transport/vehicles/{vehicle}', [VehicleController::class, 'destroy'])->middleware('permission:transport.delete');

            Route::get('transport/routes', [TransportRouteController::class, 'index'])->middleware('permission:transport.view');
            Route::post('transport/routes', [TransportRouteController::class, 'store'])->middleware('permission:transport.create');
            Route::get('transport/routes/{route}', [TransportRouteController::class, 'show'])->middleware('permission:transport.view');
            Route::put('transport/routes/{route}', [TransportRouteController::class, 'update'])->middleware('permission:transport.edit');
            Route::delete('transport/routes/{route}', [TransportRouteController::class, 'destroy'])->middleware('permission:transport.delete');
            Route::get('transport/routes/{route}/stops', [TransportRouteController::class, 'stops'])->middleware('permission:transport.view');
            Route::post('transport/routes/{route}/stops', [TransportRouteController::class, 'addStop'])->middleware('permission:transport.edit');
            Route::put('transport/stops/{stop}', [TransportRouteController::class, 'updateStop'])->middleware('permission:transport.edit');
            Route::delete('transport/stops/{stop}', [TransportRouteController::class, 'destroyStop'])->middleware('permission:transport.edit');

            Route::get('transport/allocations', [TransportAllocationController::class, 'index'])->middleware('permission:transport.view');
            Route::post('transport/allocations', [TransportAllocationController::class, 'store'])->middleware('permission:transport.create');
            Route::get('transport/allocations/{allocation}', [TransportAllocationController::class, 'show'])->middleware('permission:transport.view');
            Route::post('transport/allocations/{allocation}/deallocate', [TransportAllocationController::class, 'deallocate'])->middleware('permission:transport.edit');
            Route::delete('transport/allocations/{allocation}', [TransportAllocationController::class, 'destroy'])->middleware('permission:transport.delete');
            Route::get('transport/reports/summary', [TransportReportController::class, 'summary'])->middleware('permission:transport.export');

            Route::get('hostels', [HostelController::class, 'index'])->middleware('permission:hostel.view');
            Route::post('hostels', [HostelController::class, 'store'])->middleware('permission:hostel.create');
            Route::get('hostels/{hostel}/rooms', [HostelRoomController::class, 'index'])->middleware('permission:hostel.view');
            Route::post('hostels/{hostel}/rooms', [HostelRoomController::class, 'store'])->middleware('permission:hostel.edit');
            Route::get('hostels/{hostel}/reports/summary', [HostelReportController::class, 'summary'])->middleware('permission:hostel.export');
            Route::get('hostels/{hostel}', [HostelController::class, 'show'])->middleware('permission:hostel.view');
            Route::put('hostels/{hostel}', [HostelController::class, 'update'])->middleware('permission:hostel.edit');
            Route::delete('hostels/{hostel}', [HostelController::class, 'destroy'])->middleware('permission:hostel.delete');
            Route::get('hostel-rooms/{room}', [HostelRoomController::class, 'show'])->middleware('permission:hostel.view');
            Route::put('hostel-rooms/{room}', [HostelRoomController::class, 'update'])->middleware('permission:hostel.edit');
            Route::delete('hostel-rooms/{room}', [HostelRoomController::class, 'destroy'])->middleware('permission:hostel.delete');

            Route::get('hostel-allocations', [HostelAllocationController::class, 'index'])->middleware('permission:hostel.view');
            Route::post('hostel-allocations', [HostelAllocationController::class, 'store'])->middleware('permission:hostel.create');
            Route::get('hostel-allocations/{allocation}', [HostelAllocationController::class, 'show'])->middleware('permission:hostel.view');
            Route::post('hostel-allocations/{allocation}/vacate', [HostelAllocationController::class, 'vacate'])->middleware('permission:hostel.edit');
            Route::delete('hostel-allocations/{allocation}', [HostelAllocationController::class, 'destroy'])->middleware('permission:hostel.delete');

            Route::get('hostel-outpasses', [HostelOutpassController::class, 'index'])->middleware('permission:hostel.view');
            Route::post('hostel-outpasses', [HostelOutpassController::class, 'store'])->middleware('permission:hostel.create');
            Route::get('hostel-outpasses/{outpass}', [HostelOutpassController::class, 'show'])->middleware('permission:hostel.view');
            Route::post('hostel-outpasses/{outpass}/approve', [HostelOutpassController::class, 'approve'])->middleware('permission:hostel.edit');
            Route::post('hostel-outpasses/{outpass}/reject', [HostelOutpassController::class, 'reject'])->middleware('permission:hostel.edit');
            Route::post('hostel-outpasses/{outpass}/return', [HostelOutpassController::class, 'markReturned'])->middleware('permission:hostel.edit');
            Route::delete('hostel-outpasses/{outpass}', [HostelOutpassController::class, 'destroy'])->middleware('permission:hostel.delete');
        });
    });
});
