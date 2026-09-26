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
        'user' => ['view', 'create', 'edit', 'approve', 'delete'],
        'role' => ['view', 'create', 'edit', 'delete'],
        'finance' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'fee' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'admission' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'student' => ['view', 'create', 'edit', 'approve', 'delete', 'export'],
        'attendance' => ['view', 'create', 'edit', 'approve', 'export'],
        'scholarship' => ['view', 'create', 'edit', 'approve', 'delete'],
        'concession' => ['view', 'create', 'edit', 'approve', 'delete'],
        'fine' => ['view', 'create', 'edit', 'approve', 'delete'],
        'reminder' => ['view', 'create', 'send', 'delete'],
        'conduct' => ['view', 'create', 'edit', 'approve', 'delete'],
        'notification' => ['view', 'create', 'send', 'delete'],
        'exam' => ['view', 'create', 'edit', 'marks', 'approve', 'delete', 'export'],
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
        'report' => ['view', 'export'],
        'it' => ['view', 'create', 'edit', 'approve', 'delete'],
        'audit' => ['view', 'export'],
        'setting' => ['view', 'edit'],
        'subscription' => ['view', 'create', 'edit', 'delete'],
    ],

    /*
    | Role => permission patterns. "*" means every action on the module.
    */
    'roles' => [
        RoleName::PlatformAdmin->value => [
            'institution.*', 'campus.*', 'user.*', 'role.*',
            'subscription.*', 'audit.*', 'setting.*', 'report.view',
        ],

        RoleName::CampusAdmin->value => [
            'institution.view',
            'campus.view', 'campus.edit',
            'user.*', 'role.view',
            'admission.*', 'student.*', 'attendance.*', 'exam.*',
            'academic.*', 'timetable.*', 'scholarship.*', 'curriculum.*',
            'finance.*', 'fee.*', 'concession.*', 'fine.*', 'reminder.*',
            'conduct.*',
            'notification.*',
            'hr.*', 'payroll.view',
            'inventory.*', 'library.*', 'lab.*', 'transport.*', 'hostel.*',
            'canteen.*', 'sports.*', 'student_affairs.*',
            'complaint.*', 'circular.*', 'report.*', 'audit.view', 'setting.*',
        ],

        RoleName::Principal->value => [
            'student.view', 'attendance.view', 'exam.view', 'exam.approve',
            'academic.view', 'timetable.view', 'timetable.approve', 'scholarship.view',
            'curriculum.view', 'curriculum.approve',
            'concession.view', 'concession.approve',
            'fine.view', 'fine.approve',
            'reminder.view', 'reminder.send',
            'conduct.view', 'conduct.approve',
            'notification.view', 'notification.send',
            'report.*', 'finance.view', 'hr.view', 'complaint.view',
            'student_affairs.view', 'circular.create', 'circular.approve',
        ],

        RoleName::FinanceHead->value => [
            'finance.*', 'fee.*', 'payroll.*', 'report.*', 'audit.view',
            'scholarship.*', 'concession.*', 'fine.*', 'reminder.*',
        ],

        RoleName::Accountant->value => [
            'finance.view', 'finance.create', 'finance.edit', 'finance.export',
            'fee.view', 'fee.create', 'fee.edit', 'fee.export',
            'report.view', 'scholarship.view', 'concession.view',
            'fine.view', 'fine.create', 'fine.edit',
            'reminder.view', 'reminder.create', 'reminder.send',
        ],

        RoleName::AdmissionsOfficer->value => [
            'admission.*', 'student.view', 'student.create', 'report.view',
            'scholarship.view', 'concession.view', 'fine.view', 'reminder.view',
        ],

        RoleName::HrOfficer->value => [
            'hr.*', 'payroll.view', 'payroll.create', 'payroll.edit',
            'report.view', 'audit.view',
        ],

        RoleName::AcademicCoordinator->value => [
            'student.view', 'attendance.view', 'exam.view', 'exam.marks', 'report.view',
            'academic.view', 'academic.create', 'academic.edit',
            'curriculum.view', 'curriculum.create', 'curriculum.edit', 'curriculum.approve',
            'timetable.*',
            'conduct.view', 'conduct.create',
        ],

        RoleName::Teacher->value => [
            'student.view', 'attendance.view', 'attendance.create', 'attendance.edit',
            'exam.view', 'exam.create', 'exam.edit', 'exam.marks',
            'academic.view', 'timetable.view',
            'curriculum.view', 'curriculum.create', 'curriculum.edit',
            'conduct.view', 'conduct.create',
        ],

        RoleName::ExamController->value => [
            'exam.*', 'student.view', 'report.view',
        ],

        RoleName::StudentAffairsOfficer->value => [
            'student_affairs.*', 'sports.view', 'complaint.view', 'report.view', 'conduct.*',
        ],

        RoleName::Counsellor->value => [
            'counselling.*', 'student.view', 'student_affairs.view', 'report.view',
        ],

        RoleName::CanteenManager->value => [
            'canteen.*', 'inventory.view', 'inventory.edit', 'report.view',
        ],

        RoleName::SportsDirector->value => [
            'sports.*', 'student.view', 'inventory.view', 'report.view',
        ],

        RoleName::ItAdministrator->value => [
            'it.*', 'user.view', 'user.create', 'user.edit', 'audit.view', 'setting.view',
        ],

        RoleName::Librarian->value => [
            'library.*', 'inventory.view',
        ],

        RoleName::StoreIncharge->value => [
            'inventory.*', 'lab.view',
        ],

        RoleName::TransportHostelIncharge->value => [
            'transport.*', 'hostel.*', 'report.view',
        ],

        RoleName::ParentGuardian->value => [
            'student.view', 'attendance.view', 'exam.view', 'fee.view',
            'academic.view', 'timetable.view',
            'complaint.create', 'complaint.view', 'circular.view',
        ],

        RoleName::Student->value => [
            'attendance.view', 'exam.view', 'circular.view', 'complaint.create',
            'academic.view', 'timetable.view',
        ],
    ],
];
