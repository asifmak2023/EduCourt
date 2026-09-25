<?php

namespace App\Enums;

enum AdmissionStatus: string
{
    case Enquiry = 'enquiry';
    case Applied = 'applied';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Enrolled = 'enrolled';

    public function label(): string
    {
        return match ($this) {
            self::Enquiry => 'Enquiry',
            self::Applied => 'Applied',
            self::UnderReview => 'Under Review',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Enrolled => 'Enrolled',
        };
    }

    public function isEnrolled(): bool
    {
        return $this === self::Enrolled;
    }
}
