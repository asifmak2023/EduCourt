<?php

namespace App\Enums;

enum StaffDocumentType: string
{
    case Contract = 'contract';
    case Qualification = 'qualification';
    case Experience = 'experience';
    case IdentityCard = 'identity_card';
    case Medical = 'medical';
    case PoliceVerification = 'police_verification';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Contract => 'Employment Contract',
            self::Qualification => 'Qualification Certificate',
            self::Experience => 'Experience Certificate',
            self::IdentityCard => 'Identity Card',
            self::Medical => 'Medical Certificate',
            self::PoliceVerification => 'Police Verification',
            self::Other => 'Other',
        };
    }
}
