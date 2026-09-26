<?php

namespace App\Services\Files;

/**
 * Default no-op scanner used when no antivirus backend is configured.
 */
class NullFileScanner implements FileScanner
{
    public function scan(string $absolutePath): ?string
    {
        return null;
    }
}
