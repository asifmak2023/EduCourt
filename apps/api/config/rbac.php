<?php

use App\Enums\RoleName;

/*
|--------------------------------------------------------------------------
| RBAC definition
|--------------------------------------------------------------------------
|
| Permissions are named "<module>.<action>". The seeder expands the wildcard
| "*" into the full action set for that module. Roles are granted a set of
| permission patterns; scope (which campus/department a role applies to) is
| handled separately by App\Models\ScopeAssignment.
|
*/

return [

    'actions' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],

    'modules' => [
        'institution' => ['view', 'create', 'edit', 'delete'],
        'campus' => ['view', 'create', 'edit', 'delete'],
        'academic' => ['view', 'create', 'edit', 'delete'],
        'curriculum' => ['view', 'create', 'edit', 'delete', 'approve'],
        'timetable' => ['view', 'create', 'edit', 'approve', 'delete'],
        'user' => ['view', 'create', 'edit', 'approve', 'delete', 'photo'],
        'role' => ['view', 'create', 'edit', 'delete'],
        'finance' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'fee' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'admission' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'student' => ['view', 'create', 'edit', 'photo', 'approve', 'delete', 'export'],
        'attendance' => ['view', 'create', 'edit', 'approve', 'export'],
        'scholarship' => ['view', 'create', 'edit', 'approve', 'delete'],
        'concession' => ['view', 'create', 'edit', 'approve', 'delete'],
        'fine' => ['view', 'create', 'edit', 'approve', 'delete'],
        'reminder' => ['view', 'create', 'send', 'delete'],
        'conduct' => ['view', 'create', 'edit', 'approve', 'delete'],
        'notification' => ['view', 'create', 'send', 'delete'],
        'exam' => ['view', 'create', 'edit', 'marks', 'approve', 'delete', 'export'],
        'credit' => ['view', 'create', 'edit', 'delete', 'export'],
        'hr' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'payroll' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'inventory' => ['view', 'create', 'edit', 'delete', 'export'],
        'library' => ['view', 'create', 'edit', 'delete', 'export'],
        'lab' => ['view', 'create', 'edit', 'delete'],
        'transport' => ['view', 'create', 'edit', 'delete', 'export'],
        'hostel' => ['view', 'create', 'edit', 'delete', 'export'],
        'canteen' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'sports' => ['view', 'create', 'edit', 'delete', 'export'],
        'student_affairs' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'counselling' => ['view', 'create', 'edit', 'delete'],
        'complaint' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'circular' => ['view', 'create', 'edit', 'approve', 'delete'],
        'front_office' => ['view', 'create', 'edit', 'delete'],
        'ptm' => ['view', 'create', 'edit', 'delete'],
        'report' => ['view', 'export'],
        'it' => ['view', 'create', 'edit', 'approve', 'delete'],
        'audit' => ['view', 'export'],
        'setting' => ['view', 'edit'],
        'appearance' => ['view', 'edit'],
        'subscription' => ['view', 'create', 'edit', 'delete'],
    ],

    /*
    | Baseline permission patterns granted to every role, regardless of the
    | per-role definitions below. Use this for personal preferences that every
    | account is allowed to manage for itself.
    */
    'baseline' => [
        'appearance.view',
    ],

    /*
    | Role => permission patterns. "*" means every action on the module.
    */
    'roles' => [
        RoleName::PlatformAdmin->value => [
            'institution.*', 'campus.*', 'user.*', 'role.*',
            'subscription.*', 'audit.*', 'setting.*', 'report.view',
            'student.photo',
        ],

        RoleName::CampusAdmin->value => [
            'institution.view',
            'campus.view', 'campus.edit',
            'user.*', 'role.view',
            'admission.*', 'student.*', 'attendance.*', 'exam.*', 'credit.*',
            'academic.*', 'timetable.*', 'scholarship.*', 'curriculum.*',
            'finance.*', 'fee.*', 'concession.*', 'fine.*', 'reminder.*',
            'conduct.*',
            'notification.*',
            'hr.*', 'payroll.view',
            'inventory.*', 'library.*', 'lab.*', 'transport.*', 'hostel.*',
            'canteen.*', 'sports.*', 'student_affairs.*',
            'complaint.*', 'circular.*', 'front_office.*', 'ptm.*', 'report.*', 'audit.view', 'setting.*',
        ],

        RoleName::Principal->value => [
            'student.view', 'student.photo', 'user.view', 'attendance.view', 'exam.view', 'exam.approve',
            'credit.view',
            'academic.view', 'timetable.view', 'timetable.approve', 'scholarship.view',
            'curriculum.view', 'curriculum.approve',
            'concession.view', 'concession.approve',
            'fine.view', 'fine.approve',
            'reminder.view', 'reminder.send',
            'conduct.view', 'conduct.approve',
            'notification.view', 'notification.send',
            'report.*', 'finance.view', 'hr.view', 'complaint.view',
            'student_affairs.view', 'circular.create', 'circular.approve',
            'front_office.view', 'ptm.view', 'ptm.create', 'ptm.edit',
        ],

        RoleName::FinanceHead->value => [
            'academic.view', 'student.view',
            'finance.*', 'fee.*', 'payroll.*', 'report.*', 'audit.view',
            'scholarship.*', 'concession.*', 'fine.*', 'reminder.*',
        ],

        RoleName::Accountant->value => [
            'academic.view', 'student.view',
            'finance.view', 'finance.create', 'finance.edit', 'finance.export',
            'fee.view', 'fee.create', 'fee.edit', 'fee.export',
            'report.view', 'scholarship.view', 'concession.view',
            'fine.view', 'fine.create', 'fine.edit',
            'reminder.view', 'reminder.create', 'reminder.send',
        ],

        RoleName::AdmissionsOfficer->value => [
            'academic.view',
            'admission.*', 'student.view', 'student.create', 'student.photo', 'report.view',
            'scholarship.view', 'concession.view', 'fine.view', 'reminder.view',
            'front_office.*', 'circular.view',
        ],

        RoleName::HrOfficer->value => [
            'academic.view', 'student.view', 'user.view',
            'hr.*', 'payroll.view', 'payroll.create', 'payroll.edit',
            'report.view', 'audit.view',
        ],

        RoleName::AcademicCoordinator->value => [
            'student.view', 'user.view', 'attendance.view', 'exam.view', 'exam.marks', 'report.view',
            'academic.view', 'academic.create', 'academic.edit',
            'curriculum.view', 'curriculum.create', 'curriculum.edit', 'curriculum.approve',
            'timetable.*',
            'conduct.view', 'conduct.create',
            'credit.view', 'credit.create', 'credit.edit',
            'ptm.*',
        ],

        RoleName::Teacher->value => [
            'student.view', 'user.view', 'attendance.view', 'attendance.create', 'attendance.edit',
            'exam.view', 'exam.create', 'exam.edit', 'exam.marks',
            'academic.view', 'timetable.view',
            'curriculum.view', 'curriculum.create', 'curriculum.edit',
            'conduct.view', 'conduct.create',
            'credit.view',
            'ptm.view', 'ptm.create', 'ptm.edit',
        ],

        RoleName::ExamController->value => [
            'academic.view', 'user.view',
            'exam.*', 'credit.*', 'student.view', 'report.view',
        ],

        RoleName::StudentAffairsOfficer->value => [
            'academic.view', 'user.view',
            'student_affairs.*', 'sports.view', 'complaint.view', 'report.view', 'conduct.*',
        ],

        RoleName::Counsellor->value => [
            'academic.view', 'user.view',
            'counselling.*', 'student.view', 'student_affairs.view', 'report.view',
        ],

        RoleName::CanteenManager->value => [
            'academic.view', 'student.view',
            'canteen.*', 'inventory.view', 'inventory.edit', 'report.view',
        ],

        RoleName::SportsDirector->value => [
            'academic.view', 'user.view',
            'sports.*', 'student.view', 'inventory.view', 'report.view',
        ],

        RoleName::ItAdministrator->value => [
            'academic.view',
            'it.*', 'user.view', 'user.create', 'user.edit', 'user.photo', 'audit.view', 'setting.view',
        ],

        RoleName::Librarian->value => [
            'academic.view', 'student.view', 'user.view',
            'library.*', 'inventory.view',
        ],

        RoleName::StoreIncharge->value => [
            'academic.view', 'user.view',
            'inventory.*', 'lab.view',
        ],

        RoleName::TransportHostelIncharge->value => [
            'academic.view', 'student.view',
            'transport.*', 'hostel.*', 'report.view',
        ],

        RoleName::ParentGuardian->value => [
            'student.view', 'attendance.view', 'exam.view', 'fee.view',
            'academic.view', 'timetable.view', 'credit.view',
            'complaint.create', 'complaint.view', 'circular.view',
        ],

        RoleName::Student->value => [
            'attendance.view', 'exam.view', 'circular.view', 'complaint.create',
            'academic.view', 'timetable.view', 'credit.view',
        ],
    ],
];
