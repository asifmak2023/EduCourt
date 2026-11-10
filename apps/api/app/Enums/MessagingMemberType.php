<?php

namespace App\Enums;

/**
 * A member of an audience: an explicit guardian/student/staff record or a raw
 * phone number pasted into a list.
 */
enum MessagingMemberType: string
{
    case Guardian = 'guardian';
    case Student = 'student';
    case Staff = 'staff';
    case Phone = 'phone';

    public function label(): string
    {
        return match ($this) {
            self::Guardian => 'Guardian',
            self::Student => 'Student',
            self::Staff => 'Staff',
            self::Phone => 'Phone number',
        };
    }
}
