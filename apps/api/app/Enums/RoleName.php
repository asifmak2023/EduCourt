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
        return [self::PlatformAdmin->value, self::CampusAdmin->value];
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
