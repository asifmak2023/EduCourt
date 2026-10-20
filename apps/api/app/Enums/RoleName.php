<?php

namespace App\Enums;

enum RoleName: string
{
    /**
     * The product owner / SaaS operator. Creates institutions and the
     * campus admin account for each campus.
     */
    case PlatformAdmin = 'platform_admin';

    /**
     * Runs one campus. Creates local accounts with limited scopes and roles.
     */
    case CampusAdmin = 'campus_admin';

    /**
     * View-only oversight of every campus in one institution.
     */
    case InstitutionHead = 'institution_head';

    case Principal = 'principal';
    case FinanceHead = 'finance_head';
    case Accountant = 'accountant';
    case AdmissionsOfficer = 'admissions_officer';
    case HrOfficer = 'hr_officer';
    case AcademicCoordinator = 'academic_coordinator';
    case Teacher = 'teacher';
    case ExamController = 'exam_controller';
    case StudentAffairsOfficer = 'student_affairs_officer';
    case Counsellor = 'counsellor';
    case CanteenManager = 'canteen_manager';
    case SportsDirector = 'sports_director';
    case ItAdministrator = 'it_administrator';
    case Librarian = 'librarian';
    case StoreIncharge = 'store_incharge';
    case TransportHostelIncharge = 'transport_hostel_incharge';
    case ParentGuardian = 'parent_guardian';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::PlatformAdmin => 'Super User (Product Owner)',
            self::CampusAdmin => 'Campus Admin',
            self::InstitutionHead => 'Institution Head',
            self::Principal => 'Principal / Head',
            self::FinanceHead => 'Finance Head',
            self::Accountant => 'Accountant',
            self::AdmissionsOfficer => 'Admissions / Receptionist',
            self::HrOfficer => 'HR Officer',
            self::AcademicCoordinator => 'Academic Coordinator',
            self::Teacher => 'Teacher',
            self::ExamController => 'Exam Controller',
            self::StudentAffairsOfficer => 'Student Affairs Officer',
            self::Counsellor => 'Counsellor',
            self::CanteenManager => 'Canteen Manager',
            self::SportsDirector => 'Sports Director / Coach',
            self::ItAdministrator => 'IT Administrator',
            self::Librarian => 'Librarian / Lab In-charge',
            self::StoreIncharge => 'Store In-charge',
            self::TransportHostelIncharge => 'Transport / Hostel In-charge',
            self::ParentGuardian => 'Parent / Guardian',
            self::Student => 'Student',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::PlatformAdmin => 'Owns the product. Creates institutions and the campus admin for each campus.',
            self::CampusAdmin => 'Runs one campus. Invokes and revokes staff roles and campus-wide access.',
            self::InstitutionHead => 'View-only access across every campus of one institution. Cannot create, edit or delete records.',
            self::Principal => 'Campus-wide academic and operational oversight, with approval rights.',
            self::FinanceHead => 'Full finance, fees, payroll, scholarships and financial reports.',
            self::Accountant => 'Day-to-day fees, receipts, bookkeeping and reminders.',
            self::AdmissionsOfficer => 'Enquiries, admissions, student records and front office.',
            self::HrOfficer => 'Staff records, designations and payroll preparation.',
            self::AcademicCoordinator => 'Academic structure, timetable, curriculum and parent-teacher meetings.',
            self::Teacher => 'Class attendance, marks, lesson plans and parent-teacher meetings.',
            self::ExamController => 'Exams, marks entry, credits and result processing.',
            self::StudentAffairsOfficer => 'Clubs, events, welfare, complaints and student conduct.',
            self::Counsellor => 'Confidential counselling records for students.',
            self::CanteenManager => 'Canteen sales, stock, wallets and related inventory.',
            self::SportsDirector => 'Teams, fixtures, sports equipment and student sports records.',
            self::ItAdministrator => 'User accounts, devices, IT change requests and audit visibility.',
            self::Librarian => 'Library catalogue, circulation and related inventory.',
            self::StoreIncharge => 'Stores, inventory and laboratory stock visibility.',
            self::TransportHostelIncharge => 'Transport routes, vehicles, hostel rooms and allocations.',
            self::ParentGuardian => 'Family portal only. No staff-module access.',
            self::Student => 'Student portal only. No staff-module access.',
        };
    }

    public function department(): string
    {
        return match ($this) {
            self::PlatformAdmin, self::CampusAdmin, self::InstitutionHead, self::Principal => 'administration',
            self::FinanceHead, self::Accountant => 'finance',
            self::AdmissionsOfficer => 'admissions',
            self::HrOfficer => 'people',
            self::AcademicCoordinator, self::Teacher, self::ExamController => 'academics',
            self::StudentAffairsOfficer, self::Counsellor, self::SportsDirector => 'student_life',
            self::CanteenManager, self::Librarian, self::StoreIncharge, self::TransportHostelIncharge, self::ItAdministrator => 'operations',
            self::ParentGuardian, self::Student => 'portal',
        };
    }

    public function departmentLabel(): string
    {
        return match ($this->department()) {
            'administration' => 'Administration',
            'finance' => 'Finance',
            'admissions' => 'Admissions',
            'people' => 'People & HR',
            'academics' => 'Academics',
            'student_life' => 'Student life',
            'operations' => 'Campus operations',
            'portal' => 'Student & parent portal',
            default => 'Other',
        };
    }

    public function isPortal(): bool
    {
        return $this === self::Student || $this === self::ParentGuardian;
    }

    /**
     * Roles that must use two-factor authentication.
     *
     * @return array<int, self>
     */
    public static function twoFactorRequired(): array
    {
        return [
            self::PlatformAdmin,
            self::CampusAdmin,
            self::InstitutionHead,
            self::FinanceHead,
            self::Accountant,
            self::HrOfficer,
        ];
    }

    /**
     * Roles only the product owner (Super User) may grant. Campus admins are
     * provisioned by the product owner, never by a campus user.
     *
     * @return array<int, string>
     */
    public static function restrictedToProductOwner(): array
    {
        return [
            self::PlatformAdmin->value,
            self::CampusAdmin->value,
            self::InstitutionHead->value,
        ];
    }

    /**
     * Roles a campus admin may grant to local accounts.
     *
     * @return array<int, string>
     */
    public static function campusAdminGrantable(): array
    {
        return array_values(array_diff(
            array_map(fn (self $role) => $role->value, self::cases()),
            self::restrictedToProductOwner(),
        ));
    }
}
