<?php

namespace App\Enums;

enum AdmissionDocumentType: string
{
    case BirthCertificate = 'birth_certificate';
    case IdentityCard = 'identity_card';
    case Photo = 'photo';
    case PreviousReport = 'previous_report';
    case TransferCertificate = 'transfer_certificate';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::BirthCertificate => 'Birth Certificate',
            self::IdentityCard => 'Identity Card',
            self::Photo => 'Photograph',
            self::PreviousReport => 'Previous Report Card',
            self::TransferCertificate => 'Transfer Certificate',
            self::Other => 'Other',
        };
    }
}
