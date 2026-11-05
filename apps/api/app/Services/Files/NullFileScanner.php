<?php

namespace App\Services\Files;

use RuntimeException;

/**
 * No-op scanner used for local development and tests.
 *
 * Outside those environments this driver fails closed: an upload is rejected
 * rather than accepted unscanned, so a misconfigured production deployment can
 * never silently store unverified files. Set UPLOAD_SCANNER=clamav in
 * production to use {@see ClamavFileScanner}.
 */
class NullFileScanner implements FileScanner
{
    public function scan(string $absolutePath): ?string
    {
        if (app()->environment(['local', 'testing'])) {
            return null;
        }

        throw new RuntimeException(
            'No malware scanner is configured. Set UPLOAD_SCANNER=clamav before accepting uploads.'
        );
    }
}
