<?php

namespace App\Enums;

enum CertificateStatus: string
{
    case Pending = 'pending';
    case Issued = 'issued';
    case Revoked = 'revoked';
}
